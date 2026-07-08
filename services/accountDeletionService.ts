import { apiClient, getStoredAuth, logout } from './authService';
import { cancelSystemeMembership, fetchSystemeContactIdByEmail } from './subscriptionSystemService';

type RevokeSocialAccessResponse = {
  success?: boolean;
  message?: string;
};

const revokeSocialAccess = async (userId: string): Promise<void> => {
  const response = await apiClient.post<RevokeSocialAccessResponse>('/auth/unlink', { userId });
  const success = response?.data?.success;
  if (success === false) {
    throw new Error(response?.data?.message || 'Failed to revoke social access');
  }
};

const deleteSystemeContacts = async (email: string): Promise<void> => {
  const contactId = await fetchSystemeContactIdByEmail(email);
  if (!contactId) return;
  // We don't delete the user from Systeme anymore, just remove membership tags
  await cancelSystemeMembership(contactId);
};

const deleteUser = async (token: string): Promise<void> => {
  await apiClient.delete('/user/delete', {
    headers: {
      ssid: token,
    },
  });
};

export const deleteAccount = async (): Promise<void> => {
  const auth = await getStoredAuth();
  if (!auth?.userId || !auth?.token) {
    throw new Error('Unable to delete account: missing authentication data');
  }

  await revokeSocialAccess(auth.userId);

  if (auth.email) {
    await deleteSystemeContacts(auth.email);
  }

  await deleteUser(auth.token);
  await logout();
};
