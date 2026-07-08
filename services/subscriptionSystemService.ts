import axios from 'axios';
import { loadSystemVars } from './chatAssistantService';
import { httpGet, httpPost, httpPatch, httpDelete } from '../utils/httpClient';

type SystemVars = {
  systeme?: {
    systemeApiUrl?: string;
    systemApiUrl?: string;
    apiKey?: string;
  };
  messaging?: {
    sendGrid?: string;
  };
};

const getSystemeConfig = (systemVars: SystemVars) => {
  const systeme = systemVars?.systeme || {};
  return {
    apiUrl: systeme.systemeApiUrl || systeme.systemApiUrl || '',
    apiKey: systeme.apiKey || '',
  };
};

const SYSTEME_TAGS = {
  monthly: 'monthly_app_subscription',
  yearly: 'yearly_app_subscription',
  enrollTags: ['Enrolled_Holistic Membership', 'Enrolled_to_Membership'],
  removeTags: [
    'Canceled Holistic Membership',
    'Canceled Holistic Membership App',
    'CanceledHolisticMembershipAppInitiated',
  ],
  fullAccessTags: ['Enrolled_Holistic Membership'],
};

const getSystemeHeaders = (apiKey: string) => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-API-Key': apiKey,
});

export const fetchSystemeContactIdByEmail = async (email: string): Promise<string | null> => {
  const systemVars = (await loadSystemVars()) as SystemVars;
  const { apiUrl, apiKey } = getSystemeConfig(systemVars);
  console.log('[Subscription] Fetching Systeme contact ID by email', { email, apiUrl, apiKey });
  if (!apiUrl || !apiKey || !email) return null;

  try {
    const response = await httpGet<{ items: Array<{ id: string }> }>(
      `${apiUrl}/contacts?email=${encodeURIComponent(email)}&limit=100`,
      {
        headers: getSystemeHeaders(apiKey),
      }
    );

    const contact = response?.data?.items?.[0];
    return contact?.id || null;
  } catch (error) {
    console.warn('[Subscription] Failed to fetch Systeme contact ID', error);
    return null;
  }
};

export const fetchSystemeContactTagsRaw = async (contactId: string): Promise<Array<{ id: string; name: string }>> => {
  const systemVars = (await loadSystemVars()) as SystemVars;
  const { apiUrl, apiKey } = getSystemeConfig(systemVars);

  if (!apiUrl || !apiKey || !contactId) return [];

  try {
    const response = await httpGet<{ tags: Array<{ id: string; name: string }> }>(
      `${apiUrl}/contacts/${contactId}`,
      {
        headers: getSystemeHeaders(apiKey),
      }
    );

    const tags = response?.data?.tags || [];
    return Array.isArray(tags) ? tags : [];
  } catch (error) {
    console.warn('[Subscription] Failed to fetch Systeme contact tags', error);
    return [];
  }
};

export const fetchSystemeContactTags = async (contactId: string): Promise<string[]> => {
  const tags = await fetchSystemeContactTagsRaw(contactId);
  return tags.map((t) => t.name);
};

export const deleteSystemeContact = async (contactId: string): Promise<void> => {
  const systemVars = (await loadSystemVars()) as SystemVars;
  const { apiUrl, apiKey } = getSystemeConfig(systemVars);

  if (!apiUrl || !apiKey || !contactId) return;

  try {
    await httpDelete(`${apiUrl}/contacts/${contactId}`, {
      headers: getSystemeHeaders(apiKey),
    });
  } catch (error) {
    console.warn('[Subscription] Failed to delete Systeme contact', error);
    throw error;
  }
};

export const cancelSystemeMembership = async (contactId: string): Promise<void> => {
  const systemVars = (await loadSystemVars()) as SystemVars;
  const { apiUrl, apiKey } = getSystemeConfig(systemVars);

  if (!apiUrl || !apiKey || !contactId) return;

  // 1. Get current user tags (with IDs so we can remove them)
  const currentTags = await fetchSystemeContactTagsRaw(contactId);
  const currentTagNames = currentTags.map((t) => t.name);
  
  // Tags to remove (subscription active tags)
  const tagsToRemoveNames = [
    SYSTEME_TAGS.monthly,
    SYSTEME_TAGS.yearly,
    ...SYSTEME_TAGS.enrollTags
  ];

  // Tags to add (cancelled status tags)
  // These are defined in SYSTEME_TAGS.removeTags
  const tagsToAddNames = SYSTEME_TAGS.removeTags; 

  // We need to fetch ALL available tags from systeme to get the IDs for the "Canceled" tags we want to ADD.
  // (We can't get their IDs from the user's tags because the user doesn't have them yet!)
  const allSystemTags = await fetchTags(apiUrl, apiKey);

  // --- Step 1: Remove active subscription tags ---
  for (const name of tagsToRemoveNames) {
    // Find the tag in the user's current tags
    const tagToRemove = currentTags.find((t) => t.name === name);
    
    if (tagToRemove) {
      try {
        await httpDelete(`${apiUrl}/contacts/${contactId}/tags/${tagToRemove.id}`, {
          headers: getSystemeHeaders(apiKey),
        });
        console.log(`[Subscription] Removed tag: ${name}`);
      } catch (e) {
        console.warn(`[Subscription] Failed to remove tag: ${name}`, e);
      }
    }
  }

  // --- Step 2: Add cancelled tags ---
  for (const name of tagsToAddNames) {
    // Find the tag ID in the system's global tag list
    const tagToAdd = allSystemTags.find((t: { name: string; id: string }) => t.name === name);
    
    if (tagToAdd) {
      // Check if user already has it to avoid redundant calls
      if (!currentTagNames.includes(name)) {
        try {
          await httpPost(
            `${apiUrl}/contacts/${contactId}/tags`,
            { tagId: tagToAdd.id },
            { 
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
              },
            }
          );
          console.log(`[Subscription] Added tag: ${name}`);
        } catch (e) {
          console.warn(`[Subscription] Failed to add tag: ${name}`, e);
        }
      }
    } else {
      console.warn(`[Subscription] Tag not found in system: ${name}`);
    }
  }
};

export const getSystemeMembershipStatus = async (email: string): Promise<{
  hasFullAccess: boolean;
  contactId: string | null;
  tags: string[];
}> => {
  if (!email) {
    return { hasFullAccess: false, contactId: null, tags: [] };
  }

  const contactId = await fetchSystemeContactIdByEmail(email);
  if (!contactId) {
    return { hasFullAccess: false, contactId: null, tags: [] };
  }

  const tags = await fetchSystemeContactTags(contactId);
  const hasFullAccess = tags.some((tag) => SYSTEME_TAGS.fullAccessTags.includes(tag));

  return { hasFullAccess, contactId, tags };
};

export const registerPhoneNumber = async (contactId: string, phoneNumber: string): Promise<void> => {
  const systemVars = (await loadSystemVars()) as SystemVars;
  const { apiUrl, apiKey } = getSystemeConfig(systemVars);

  if (!apiUrl || !apiKey || !contactId || !phoneNumber) return;

  await httpPatch(
    `${apiUrl}/contacts/${contactId}`,
    {
      fields: [
        {
          slug: 'phone_number',
          value: phoneNumber,
        },
      ],
    },
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/merge-patch+json',
        'X-API-Key': apiKey,
      },
    }
  );
};

const fetchTags = async (apiUrl: string, apiKey: string) => {
  const response = await httpGet<{ items: any[] }>(
    `${apiUrl}/tags?limit=100`,
    {
      headers: {
        Accept: 'application/json',
        'X-API-Key': apiKey,
      },
    }
  );

  return response?.data?.items || [];
};

export const assignSubscriptionTags = async (
  contactId: string,
  period: 'MONTHLY' | 'YEARLY'
): Promise<void> => {
  const systemVars = (await loadSystemVars()) as SystemVars;
  const { apiUrl, apiKey } = getSystemeConfig(systemVars);

  if (!apiUrl || !apiKey || !contactId) return;

  const tags = await fetchTags(apiUrl, apiKey);
  const subscriptionTag = period === 'MONTHLY' ? SYSTEME_TAGS.monthly : SYSTEME_TAGS.yearly;
  const tagsToAssign = [subscriptionTag, ...SYSTEME_TAGS.enrollTags];

  for (const tagName of SYSTEME_TAGS.removeTags) {
    const tagToRemove = tags.find((tag: { name: string }) => tag.name === tagName);
    if (!tagToRemove) continue;
    await httpDelete(`${apiUrl}/contacts/${contactId}/tags/${tagToRemove.id}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
    });
  }

  for (const tagName of tagsToAssign) {
    const tag = tags.find((item: { name: string }) => item.name === tagName);
    if (!tag) continue;
    await httpPost(
      `${apiUrl}/contacts/${contactId}/tags`,
      { tagId: tag.id },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
      }
    );
  }
};

export const sendSubscriptionEmail = async (email: string, fullName: string): Promise<void> => {
  const systemVars = (await loadSystemVars()) as SystemVars;
  const apiKey = systemVars?.messaging?.sendGrid;

  if (!apiKey || !email) return;

  const payload = {
    from: {
      email: 'connect@meditatewithabhi.com',
      name: 'The School Of Breath',
    },
    template_id: 'd-04148f8a5490495191c747fea2c7cb07',
    personalizations: [
      {
        to: [
          {
            email,
            name: fullName,
          },
        ],
        subject: 'Your Holistic Membership for The School of Breath App is Confirmed!',
      },
    ],
  };

  await axios.post('https://api.sendgrid.com/v3/mail/send', payload, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
};

export const runPostPurchaseTasks = async (params: {
  contactId: string;
  phoneNumber: string;
  period: 'MONTHLY' | 'YEARLY';
  email: string;
  fullName: string;
}): Promise<void> => {
  try {
    await registerPhoneNumber(params.contactId, params.phoneNumber);
  } catch (error) {
    console.warn('[Subscription] Phone update failed', error);
  }

  try {
    await assignSubscriptionTags(params.contactId, params.period);
  } catch (error) {
    console.warn('[Subscription] Tag sync failed', error);
  }

  try {
    await sendSubscriptionEmail(params.email, params.fullName);
  } catch (error) {
    console.warn('[Subscription] Confirmation email failed', error);
  }
};
