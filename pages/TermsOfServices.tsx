import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export const TermsOfServices: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen h-[100dvh] bg-gradient-dusk text-white flex flex-col">
      <div className="shrink-0 z-10 bg-brand-midnight/90 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-4 px-6 py-4 pt-safe">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-serif font-bold">Terms of Services</h1>
        </div>
      </div>

      <div
        className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pt-6 pb-12 pb-safe"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="pointer-events-none absolute -top-24 right-[-10%] w-80 h-80 bg-brand-gold/10 rounded-full blur-[90px]" />
        <div className="pointer-events-none absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-brand-primary/15 rounded-full blur-[90px]" />

        <div className="relative max-w-3xl mx-auto">
          <div className="bg-white/95 dark:bg-brand-darkSurface/95 text-brand-dark dark:text-brand-darkText rounded-3xl p-6 md:p-10 shadow-2xl border border-brand-light/60 dark:border-brand-darkBorder/60">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 dark:bg-brand-gold/20 flex items-center justify-center">
                <FileText size={20} className="text-brand-primary dark:text-brand-gold" />
              </div>
              <p className="text-sm md:text-base text-brand-medium/80 dark:text-brand-darkTextMuted/80">
                MOBILE APPLICATION END-USER LICENSE AGREEMENT (EULA)
              </p>
            </div>

            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              PLEASE READ THIS MOBILE APPLICATION END-USER LICENSE AGREEMENT ("EULA AGREEMENT") CAREFULLY, BEFORE COMPLETING THE DOWNLOAD OR INSTALLATION PROCESS OR USING THE APPLICATION, AS IT CONTAINS IMPORTANT INFORMATION REGARDING YOUR LEGAL RIGHTS AND REMEDIES.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">1. OVERVIEW</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              This EULA agreement is a binding agreement, entered into by and between PossibilityAI Inc, registered address 126 S Cypress Rd, Pompano Beach, FL 33060, USA ("PossibilityAI Inc") and you, and is made effective as of the date you download, install or use the Application The School Of Breath ("Application") or from the date of your electronic acceptance. This EULA agreement sets forth the general terms and conditions of your use of the Application, provides a license to use PossibilityAI Inc Application and contains liability disclaimers. This EULA agreement’s terms also apply to any Application update, upgrade, internet-based service, and support service for the Application. Whether you are acquiring Application directly from PossibilityAI Inc or through PossibilityAI Inc authorized reseller your electronic acceptance of this EULA agreement signifies that you have read, understand, acknowledge, and agree to be bound by this EULA agreement. The terms "we", "us" or "our" shall refer to PossibilityAI Inc. The terms "you", "your", or "User" shall refer to any individual or entity who accepts this EULA agreement, uses our Application, or has access to our Application. PossibilityAI Inc may, in its sole and absolute discretion, change or modify this Agreement, and any policies or agreements which are incorporated herein, at any time, and such changes or modifications shall be effective immediately upon posting. Your use of this Application after such changes or modifications have been made shall constitute your acceptance of this EULA agreement as last revised.
            </p>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              BY DOWNLOADING /INSTALLING /USING THE APPLICATION YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTAND THIS AGREEMENT. IF YOU DO NOT AGREE TO BE BOUND BY THIS EULA AGREEMENT AS LAST REVISED, DO NOT DOWNLOAD, INSTALL, USE (OR CONTINUE TO USE) OUR APPLICATION.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">2. ELIGIBILITY</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              Our Application is available only to Users who can form legally binding contracts under the applicable law. By downloading or using this Application, you represent and warrant that you are:
            </p>
            <ul className="list-disc pl-5 text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              <li>(i) at least eighteen (18) years of age,</li>
              <li>(ii) otherwise recognized as being able to form legally binding contracts under applicable law, and</li>
              <li>(iii) are not a person barred from purchasing or using the Application under the laws of the United States or other applicable jurisdiction.</li>
            </ul>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              If you are entering into this EULA agreement on behalf of a company or any corporate entity, you represent and warrant that you have the legal authority to bind such corporate entity to the terms and conditions contained in this EULA agreement, in which case the terms “you”, “your”, or “User” shall refer to such corporate entity. If you do not have such authority or if you do not agree with the terms and conditions of this EULA agreement, do not install or use the Application, and you must not accept this EULA agreement. If, after your electronic acceptance of this Agreement, PossibilityAI Inc finds that you do not have the legal authority to bind such a corporate entity, you will be personally responsible for the obligations contained in this EULA agreement.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">3. LICENSE GRANT</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              Subject to the terms of this EULA Agreement PossibilityAI Inc hereby grants you a personal, revocable, worldwide, non-exclusive, non-sublicensable, and non-transferable license to use the PossibilityAI Inc Application on your own, non-commercial use devices in accordance with the terms of this EULA agreement. The Application is being licensed to you and you hereby acknowledge that no title or ownership of the Application is being transferred or assigned to you and this EULA agreement is not to be construed as a sale of any rights of the Application. You are permitted to load the PossibilityAI Inc Application (for example on a mobile, tablet or laptop) under your control. You are responsible for ensuring your device meets the minimum requirements of the PossibilityAI Inc Application.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">4. RESTRICTIONS</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              Without first obtaining the express written consent of PossibilityAI Inc, you may not assign your rights and obligations under this EULA agreement, or redistribute, encumber, sell, rent, lease, sublicense or in other way transfer your rights to the Application. You are not permitted to: edit, modify, alter, adapt, or otherwise change the whole or any part of the PossibilityAI Inc Application nor permit the whole or any part of the Application to be combined with or become incorporated in any other Application or any software, nor decompile, disassemble or reverse engineer the Application or attempt to do any of the listed actions, copy, reproduce, duplicate, resell or distribute in any medium any part of the Application, except where expressly authorized by PossibilityAI Inc, remove or alter PossibilityAI Inc trademarks or logos or legal notices included in the Application or related assets, remove, disable, circumvent, or otherwise create or implement any workaround to any copy protection, rights management, or security features in or protecting the Application, use the service to try to gain unauthorized access to any service, data, account or network by any means, use the Application in any way which breaches any applicable local, national or international law, use the Application for any purpose that PossibilityAI Inc, considers is a breach of this EULA agreement. PossibilityAI Inc reserves the right to determine in its sole discretion what kind of conduct is considered to be in violation of the terms of this EULA agreement. By using our Application you acknowledge and agree that your use of the Application, including any content you submit, will comply with this EULA agreement and all applicable local, state, national and international laws, rules, and regulations.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">5. INTELLECTUAL PROPERTY</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              No part of this EULA agreement is or should be interpreted as a transfer of intellectual property rights. PossibilityAI Inc shall retain ownership of the Application as originally downloaded by you and all subsequent downloads of the Application by you. The Application (and the copyright, and other intellectual property rights of whatever nature in the Application, including any modifications made thereto) are and shall remain the property of PossibilityAI Inc. In addition to the general rules above, the provisions in this Section apply specifically to your use of PossibilityAI Inc content used in the Application (PossibilityAI Inc content). PossibilityAI Inc content used in this Application, including without limitation the ThemeText, scripts, source code, API, graphics, photos, sounds, music, videos, and interactive features and the trademarks, service marks, and logos contained therein, are owned by or licensed to PossibilityAI Inc in perpetuity, and are subject to copyright, trademark, and/or patent protection. PossibilityAI Inc content is provided to you “as is”, “as available” and “with all faults” for your information and personal, non-commercial use only and may not be downloaded, copied, reproduced, distributed, transmitted, broadcast, displayed, sold, licensed, or otherwise exploited for any purposes whatsoever without the express prior written consent of PossibilityAI Inc. No right or license under any copyright, trademark, patent or other proprietary right or license is granted by this EULA agreement.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">6. COLLECTION AND USE OF YOUR INFORMATION</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              You acknowledge that when you download, install, or use the Application, PossibilityAI Inc may use automatic means (including, for example, cookies and web beacons) to collect information about your Mobile Device and about your use of the Application. You also may be required to provide certain information about yourself as a condition to downloading, installing, or using the Application or certain of its features or functionality. All information we collect through or in connection with this Application is subject to our Privacy policy. By downloading, installing, using, and providing information to or through this Application, you consent to all actions taken by us with respect to your information in compliance with the Privacy Policy.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">7. UPDATES</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              PossibilityAI Inc may from time to time in its sole discretion develop and provide Application updates, which may include upgrades, bug fixes, patches, other error corrections, and/or new features (collectively, including related documentation, "Updates"). Updates may also modify or delete in their entirety certain features and functionality. You agree that PossibilityAI Inc has no obligation to provide any Updates or to continue to provide or enable any particular features or functionality. Based on your Mobile Device settings, when your Mobile Device is connected to the internet either: the Application will automatically download and install all available Updates; or you may receive notice of or be prompted to download and install available Updates. You shall promptly download and install all Updates and acknowledge and agree that the Application or portions thereof may not properly operate should you fail to do so. You further agree that all Updates will be deemed part of the Application and be subject to all terms and conditions of this Agreement
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">8. THIRD-PARTY MATERIALS</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              The Application may display, include, or make available third-party content (including data, information, applications, and other products, services, and/or materials) or provide links to third-party websites or services, including through third-party advertising ("Third-Party Materials"). You acknowledge and agree that PossibilityAI Inc is not responsible for ThirdParty Materials, including their accuracy, completeness, timeliness, validity, copyright compliance, legality, decency, quality, or any other aspect thereof. PossibilityAI Inc does not assume and will not have any liability or responsibility to you or any other person or entity for any Third-Party Materials. Third-Party Materials and links thereto are provided solely as a convenience to you, and you access and use them entirely at your own risk and subject to such third parties terms and conditions.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">9. PossibilityAI Inc USE OF USER CONTENT</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              The Application may allow you to create content such as videos, data, photographs, messages, graphics, ThemeText, and other information (“User Content”), and to share such User Content with PossibilityAI Inc or with other applications, sites, including social networking sites, as you may designate. The provisions in this Section apply specifically to PossibilityAI Inc use of User Content posted to or through the Application. You shall be solely responsible for any and all of your User Content or User Content that is submitted by you, and the consequences of, and requirements for, distributing it. You agree that any User Content that you share does not and will not violate third-party rights of any kind, including and without limitation any Intellectual Property Rights or rights of publicity and privacy. With Respect to User Content, by posting or publishing User Content to or through the Application, you authorize Company to use the intellectual property and other proprietary rights in and to your User Content to enable inclusion and use of the User Content in the manner contemplated by this Application and this EULA agreement.
            </p>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              You hereby grant PossibilityAI Inc a worldwide, non-exclusive, royalty-free, sub-licensable, irrevocable, and transferable license to use, reproduce, distribute, prepare derivative works of, combine with other works, display, and perform your User Content in connection with this Application, including without limitation for promoting and redistributing all or part of this Application in any media formats and through any media channels without restrictions of any kind and without payment or other consideration of any kind, or permission or notification, to you or any third party. You also hereby grant each User of this Application a non-exclusive license to access your User Content through this Application, and to use, reproduce, distribute, prepare derivative works of, combine with other works, display, and perform your User Content as permitted through the functionality of this Software and under this EULA agreement. The above licenses granted by you in your User Content terminate within a commercially reasonable time after you remove or delete your User Content from this Application. You understand and agree, however, that PossibilityAI Inc may retain (but not distribute, display, or perform) server copies of your User Content that have been removed or deleted. The above licenses granted by you in your User Content are perpetual and irrevocable. PossibilityAI Inc generally does not pre-screen User Content but reserves the right (but undertakes no duty) to do so and decide whether any item of User Content is appropriate and/or complies with this EULA agreement. PossibilityAI Inc may remove any item of User Content if it violating this EULA agreement, at any time and without prior notice.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">10. USER SUBMISSIONS</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              With Respect to User Submissions, you acknowledge and agree that: your User Submissions are entirely voluntary, your User Submissions do not establish a confidential relationship or obligate PossibilityAI Inc to treat your User Submissions as confidential or secret. PossibilityAI Inc has no obligation, either express or implied, to develop or use your User Submissions, and no compensation is due to you or to anyone else for any intentional or unintentional use of your User Submissions. PossibilityAI Inc shall own exclusive rights (including all intellectual property and other proprietary rights) to any User Submissions provided to the PossibilityAI Inc and shall be entitled to the unrestricted use and dissemination of any User Submissions posted to or through the Software for any purpose, commercial or otherwise, without acknowledgment or compensation to you or to anyone else.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">11. DOWNLOADING THE APPLICATION FROM THE APPLE APP STORE</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              The following applies to the Application accessed through or downloaded from the Apple App Store (“App Store Sourced Application”):
            </p>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              You acknowledge and agree that:
            </p>
            <ul className="list-disc pl-5 text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              <li>(i) this EULA agreement is concluded between you and PossibilityAI Inc only, and not Apple; and</li>
              <li>(ii) PossibilityAI Inc, not Apple, is solely responsible for the App Store Sourced Application and content thereof. Your use of the App Store Sourced Application must comply with the Apple App Store Terms of Service.</li>
            </ul>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              You will use the App Store Sourced Application only:
            </p>
            <ul className="list-disc pl-5 text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              <li>(i) on an Apple-branded product that runs iOS (Apple’s proprietary operating system software); and</li>
              <li>(ii) as permitted by the “Usage Rules” set forth in the Apple App Store Terms of Service.</li>
            </ul>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              You acknowledge that Apple has no obligation whatsoever to furnish any maintenance and support services with respect to the App Store Sourced Application. In the event of any failure of any App Store Sourced Application to conform to any applicable warranty, you may notify Apple, and Apple will refund the purchase price for the App Store Sourced Application to you and to the maximum extent permitted by applicable law, Apple will have no other warranty obligation whatsoever with respect to the App Store Sourced Application. As between PossibilityAI Inc and Apple, any other claims, losses, liabilities, damages, costs or expenses attributable to any failure to conform to any warranty will be the sole responsibility of PossibilityAI Inc.
            </p>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              You and PossibilityAI Inc acknowledge that, as between PossibilityAI Inc and Apple, Apple is not responsible for addressing any claims you have or any claims of any third party relating to the App Store Sourced Application in your possession and use of the App Store Sourced Application, including but not limited to:
            </p>
            <ul className="list-disc pl-5 text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              <li>(i) product liability claims;</li>
              <li>(ii) any claim that an App Store Sourced Application fails to conform to any applicable legal or regulatory requirement; and</li>
              <li>(iii) claims arising under consumer protection or similar legislation.</li>
            </ul>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              You and PossibilityAI Inc acknowledge that, in the event of any third party claim that an App Store Sourced Application or your possession and use of that App Store Source Application infringes that third party’s intellectual property rights, as between PossibilityAI Inc and Apple, PossibilityAI Inc, not Apple, will be solely responsible for the investigation, defense, settlement and discharge of any such intellectual property infringement claim to the extent required by this EULA agreement. You and PossibilityAI Inc, acknowledge and agree that Apple and its subsidiaries are third-party beneficiaries of this EULA agreement and that upon your acceptance of this EULA agreement, Apple will have the right (and will be deemed to have accepted the right) to enforce this EULA agreement. By using the App Store Sourced Application you represent and warrant that:
            </p>
             <ul className="list-disc pl-5 text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              <li>(i) you are not located in a country that is subject to a U.S. Government embargo, or that has been designated by the U.S. Government as a “terrorist supporting” country; and</li>
              <li>(ii) you are not listed on any U.S. Government list of prohibited or restricted parties. Without limiting any other terms of this EULA agreement, you must comply with all applicable third-party terms of agreement when using the App Store Sourced Application.</li>
            </ul>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">12. DISCLAIMER OF WARRANTIES</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              UNLESS OTHERWISE EXPLICITLY AGREED TO IN WRITING BY PossibilityAI Inc, APPLICATION IS PROVIDED “AS IS”, “AS AVAILABLE” AND “WITH ALL FAULTS” AND DEFECTS AND PossibilityAI Inc, MAKES NO OTHER WARRANTIES, EXPRESS OR IMPLIED, IN FACT, OR IN LAW, INCLUDING, BUT NOT LIMITED TO, ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT, OTHER THAN AS SET FORTH IN THIS EULA AGREEMENT. PossibilityAI Inc MAKES NO WARRANTIES ABOUT (i) THE ACCURACY, COMPLETENESS, OR CONTENT ON THIS APPLICATION AND ASSUMES NO LIABILITY OR RESPONSIBILITY FOR THE SAME. PossibilityAI Inc MAKES NO WARRANTIES THAT THE OPERATION OF THE APPLICATION WILL BE SECURE, ERROR-FREE, OR FREE FROM INTERRUPTION. NO ORAL OR WRITTEN ADVICE PROVIDED BY PossibilityAI Inc OR ANY AUTHORIZED REPRESENTATIVE OR THIRD PARTY SHALL CREATE A WARRANTY. SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF, OR LIMITATIONS ON, IMPLIED WARRANTIES OR THE LIMITATIONS ON THE APPLICABLE STATUTORY RIGHTS OF A CONSUMER, SO SOME OR ALL OF THE ABOVE EXCLUSIONS AND LIMITATIONS MAY NOT APPLY TO YOU. THE FOREGOING DISCLAIMER OF REPRESENTATIONS AND WARRANTIES SHALL APPLY TO THE FULLEST EXTENT PERMITTED BY LAW AND SHALL SURVIVE ANY TERMINATION OR EXPIRATION OF THIS EULA AGREEMENT OR YOUR USE OF THIS SITE OR THE SERVICES FOUND AT THIS SITE.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">13. LIMITATION OF LIABILITY</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              TO THE FULLEST EXTENT PERMISSIBLE BY APPLICABLE LAW, IN NO EVENT SHALL PossibilityAI Inc, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND ALL THIRD-PARTY SERVICE PROVIDERS, BE LIABLE TO YOU OR ANY OTHER PERSON OR ENTITY FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, PUNITIVE, OR CONSEQUENTIAL DAMAGES WHATSOEVER, INCLUDING ANY DAMAGES THAT MAY RESULT FROM (i) THIS AGREEMENT, (ii) THE ACCURACY, COMPLETENESS, OR CONTENT ON THIS APPLICATION, (iii) OR FROM THE FURNISHING, PERFORMANCE, INSTALLATION, OR USE OF THE APPLICATION, WHEATHER DUE TO A BREACH OF CONTRACT, BREACH OF WARRANTY, OR THE NEGLIGENCE OF PossibilityAI Inc OR ANY OTHER PARTY, EVEN IF PossibilityAI Inc IS ADVISED BEFOREHAND OF THE POSSIBILITY OF SUCH DAMAGES. SOME JURISDICTIONS DO NOT ALLOW A LIMITATION OF LIABILITY FOR DEATH, PERSONAL INJURY, FRAUDULENT MISREPRESENTATIONS OR CERTAIN INTENTIONAL OR NEGLIGENT ACTS, OR VIOLATION OF SPECIFIC STATUTES, OR THE LIMITATION OF INCIDENTAL OR CONSEQUENTIAL DAMAGES, SO SOME OR ALL OF THE ABOVE LIMITATIONS OF LIABILITY MAY NOT APPLY TO YOU. IN NO EVENT SHALL PossibilityAI Inc’S TOTAL LIABILITY TO YOU FOR ALL DAMAGES (EXCEPT AS REQUIRED BY APPLICABLE LAW) EXCEED THE AMOUNT ACTUALLY PAID BY YOU FOR THE APPLICATION. THIS LIMITATION APPLIES, BUT IT IS NOT LIMITED TO ANYTHING RELATED TO THE APPLICATION, SERVICES, OR CONTENT MADE AVAILABLE THROUGH THE APPLICATION. YOU AGREE THAT THE PROVISIONS IN THIS EULA AGREEMENT THAT LIMIT LIABILITY ARE ESSENTIAL TERMS OF THIS EULA AGREEMENT. THE FOREGOING LIMITATION OF LIABILITY SHALL APPLY TO THE FULLEST EXTENT PERMITTED BY LAW AND SHALL SURVIVE ANY TERMINATION OR EXPIRATION OF THIS EULA AGREEMENT.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">14. INDEMNITY</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              You agree to protect, defend, indemnify and hold harmless PossibilityAI Inc and its officers, directors, employees, agents from and against any and all claims, demands, costs, expenses, losses, liabilities, and damages of every kind and nature (including, without limitation, reasonable attorneys’ fees) imposed upon or incurred by PossibilityAI Inc directly or indirectly arising from (i) your use of the Application; (ii) your violation of any provision of this Agreement; and/or (iii) your violation of any third-party right, including without limitation any intellectual property or other proprietary rights. The indemnification obligations under this section shall survive any termination or expiration of this Agreement or your use of Application.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">15. AVAILABILITY OF APPLICATION</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              Subject to the terms and conditions of this Agreement and our policies, we shall use commercially reasonable efforts to attempt to provide this Application on 24/7 basis. You acknowledge and agree that from time to time this Application may be inaccessible for any reason including, but not limited to, periodic maintenance, repairs or replacements that we undertake from time to time, or other causes beyond our control including, but not limited to, interruption or failure of telecommunication or digital transmission links or other failures. You acknowledge and agree that we have no control over the availability of this Application on a continuous or uninterrupted basis and that we assume no liability to you or any other party with regard thereto.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">16. TERMINATION</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              This EULA agreement is effective from the date you first download, install or use the Application and shall continue until terminated. You may terminate this Agreement by deleting the Application and all copies thereof from your Mobile Device. This EULA agreement will also be terminated immediately if you fail to comply with any term of this EULA agreement. Upon such termination, the licenses granted by this EULA agreement will immediately terminate and you agree to stop all access and use of the Application. The provisions that by their nature continue and survive will survive any termination of this EULA agreement. PossibilityAI Inc reserves the right to cease offering or providing Application at any time, for any or no reason, and without prior notice. Although PossibilityAI Inc makes a great effort to maximize the lifespan of the Application, it might be, that the Application we offer will be discontinued. If that is the case, this EULA agreement will be terminated, and the Application will no longer be supported by PossibilityAI Inc. Upon termination, all rights granted to you under this EULA agreement will also terminate and you must cease all use of the Application and delete all copies of the Application from your Mobile Device and account.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">17. COMPLIANCE WITH LOCAL LAWS</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              PossibilityAI Inc makes no representation or warranty that all the content available on this Application is appropriate in every country or jurisdiction and use of this Application from countries or jurisdictions where its content is illegal is prohibited. Users who choose to use this Software are responsible for compliance with all local laws, rules, and regulations
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">18. GOVERNING LAW</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              This EULA agreement and any dispute or claim arising out of or in connection with it or its subject matter or formation shall be governed by and construed in accordance with the laws of United States, to the exclusion of conflict of law rules.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">19. TITLES AND HEADINGS</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              The titles and headings of this EULA agreement are for convenience and ease of reference only and shall not be utilized in any way to construe or interpret the agreement of the parties as otherwise set forth herein.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">20. LIMITATION OF TIME TO FILE CLAIMS</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              ANY CAUSE OF ACTION OR CLAIM YOU MAY HAVE ARISING OUT OF OR RELATING TO THIS AGREEMENT OR THE APPLICATION MUST BE COMMENCED WITHIN ONE (1) YEAR AFTER THE CAUSE OF ACTION ACCRUES OTHERWISE SUCH CAUSE OF ACTION OR CLAIM IS PERMANENTLY BARRED.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">21. SEVERABILITY</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              Each covenant and agreement in this EULA agreement shall be construed for all purposes to be a separate and independent covenant or agreement. If a court of competent jurisdiction holds any provision (or portion of a provision) of this EULA agreement to be illegal, invalid, or otherwise unenforceable, the remaining provisions (or portions of provisions) of this EULA agreement shall not be affected thereby and shall be found to be valid and enforceable to the fullest extent permitted by law.
            </p>

            <h2 className="text-lg md:text-xl font-serif font-bold mb-3">22. CONTACT INFORMATION</h2>
            <p className="text-sm md:text-base leading-relaxed text-brand-medium/90 dark:text-brand-darkTextMuted mb-6">
              If you have any questions about this EULA agreement, please contact us by email or regular mail at the following address: PossibilityAI Inc 126 S Cypress Rd, Pompano Beach, FL 33060, USA, you may also write us at:{' '}
              <a
                href="mailto:connect@meditatewithabhi.com"
                className="text-brand-primary dark:text-brand-gold font-semibold underline"
              >
                connect@meditatewithabhi.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
