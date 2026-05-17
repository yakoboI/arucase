/** Fields stored in website_settings — edited in Site & Contacts admin */
export const SITE_CONTACT_FIELD_GROUPS = [
  {
    title: 'Main contact',
    description: 'Shown on Contact page, homepage footer, and other public areas.',
    fields: [
      { key: 'contact_address', label: 'Postal address', type: 'textarea' },
      { key: 'contact_phone', label: 'Phone', type: 'tel' },
      { key: 'contact_email', label: 'Main email', type: 'email' },
      { key: 'contact_whatsapp', label: 'WhatsApp', type: 'tel' },
    ],
  },
  {
    title: 'Office hours',
    fields: [
      { key: 'office_weekdays', label: 'Monday – Friday', type: 'text' },
      { key: 'office_saturday', label: 'Saturday', type: 'text' },
      { key: 'office_sunday', label: 'Sunday', type: 'text' },
      { key: 'office_holidays', label: 'Public holidays', type: 'text' },
    ],
  },
  {
    title: 'Social & map',
    fields: [
      { key: 'social_location', label: 'Google Maps link (share URL)', type: 'url' },
      { key: 'social_youtube', label: 'YouTube URL', type: 'url' },
      { key: 'social_facebook', label: 'Facebook URL', type: 'url' },
      { key: 'social_instagram', label: 'Instagram URL', type: 'url' },
      { key: 'social_twitter', label: 'Twitter / X URL', type: 'url' },
    ],
  },
  {
    title: 'Department emails',
    fields: [
      { key: 'admissions_email', label: 'Admissions', type: 'email' },
      { key: 'academics_email', label: 'Academics', type: 'email' },
      { key: 'bursar_email', label: 'Bursar', type: 'email' },
      { key: 'alumni_email', label: 'Alumni', type: 'email' },
      { key: 'parents_email', label: 'Parents office', type: 'email' },
    ],
  },
];

export const EMPTY_SITE_CONTACT_FORM = SITE_CONTACT_FIELD_GROUPS.reduce((acc, group) => {
  group.fields.forEach((f) => {
    acc[f.key] = '';
  });
  return acc;
}, {});
