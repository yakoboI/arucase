// Lightweight i18n helper (scalable: add keys/languages in one place)
const translations = {
  sw: {
    common: {
      backToHome: 'Rudi Nyumbani',
      loading: 'Inapakia...',
    },
    contact: {
      pageTitle: 'Wasiliana Nasi',
      getInTouch: 'Wasiliana Nasi',
      intro:
        'Tunakaribisha maswali na mawasiliano kutoka kwa wanafunzi watarajiwa, wazazi, wahitimu, na marafiki wa seminari. Tafadhali wasiliana nasi kupitia mojawapo ya njia zifuatazo:',
      contactInformation: 'Taarifa za Mawasiliano',
      address: 'Anwani',
      phone: 'Simu',
      email: 'Barua pepe',
      whatsapp: 'WhatsApp',
      officeHours: 'Saa za Ofisi',
      officeHoursItems: {
        monFri: 'Jumatatu - Ijumaa',
        saturday: 'Jumamosi',
        sunday: 'Jumapili',
        publicHolidays: 'Siku za Sikukuu',
        monFriTime: '8:00 AM - 4:00 PM',
        saturdayTime: "9:00 AM - 12:00 PM (Siku za Wazazi)",
        sundayTime: 'Imefungwa',
        publicHolidaysTime: 'Imefungwa',
      },
      departmentContacts: 'Mawasiliano ya Idara',
      departments: {
        admissions: 'Udahili',
        academics: 'Masuala ya Taaluma',
        bursar: 'Bursar (Ada)',
        alumni: 'Mahusiano ya Wahitimu',
        parentsOffice: 'Ofisi ya Wazazi',
      },
      visitUs: 'Tembelea',
      visitUsBody:
        'Wageni wanakaribishwa kutembelea eneo letu kwa miadi. Tafadhali wasiliana nasi mapema kupanga ziara. Ziara hufanyika ndani ya saa za ofisi.',
      directions: 'Maelekezo',
      directionsBody:
        'Seminari ipo Arusha, Tanzania. Kwa maelekezo ya kina, tafadhali tumia ramani hapa chini au wasiliana na ofisi yetu.',
      googleMapsCta: 'Pata Maelekezo kwenye Google Maps',
      followUs: 'Tufuatilie Mitandaoni',
      followUsBody: 'Pata taarifa za habari na matukio ya seminari kwa kutufuatilia kupitia:',
      loadingPage: 'Inapakia ukurasa wa mawasiliano...',
    },
  },
  en: {
    // Keep English as fallback for other pages.
    common: {
      backToHome: 'Back to Home',
      loading: 'Loading...',
    },
    contact: {
      pageTitle: 'Contact Us',
      getInTouch: 'Get in Touch',
      intro:
        'We welcome inquiries from prospective students, parents, alumni, and friends of the seminary. Please feel free to reach out to us through any of the following channels:',
      contactInformation: 'Contact Information',
      address: 'Address',
      phone: 'Phone',
      email: 'Email',
      whatsapp: 'WhatsApp',
      officeHours: 'Office Hours',
      officeHoursItems: {
        monFri: 'Monday - Friday',
        saturday: 'Saturday',
        sunday: 'Sunday',
        publicHolidays: 'Public Holidays',
        monFriTime: '8:00 AM - 4:00 PM',
        saturdayTime: "9:00 AM - 12:00 PM (Parents' Days)",
        sundayTime: 'Closed',
        publicHolidaysTime: 'Closed',
      },
      departmentContacts: 'Department Contacts',
      departments: {
        admissions: 'Admissions',
        academics: 'Academic Affairs',
        bursar: 'Bursar (Fees)',
        alumni: 'Alumni Relations',
        parentsOffice: "Parents' Office",
      },
      visitUs: 'Visit Us',
      visitUsBody:
        'Visitors are welcome to tour our campus by appointment. Please contact us in advance to schedule a visit. Our campus is open for tours during office hours.',
      directions: 'Directions',
      directionsBody:
        'The seminary is located in Arusha, Tanzania. For detailed directions, please use the map below or contact our office.',
      googleMapsCta: 'Get Directions on Google Maps',
      followUs: 'Follow Us on Social Media',
      followUsBody: 'Stay updated with seminary news and events by following us on:',
      loadingPage: 'Loading contact page...',
    },
  },
};

export function getPreferredLanguage() {
  try {
    const stored = localStorage.getItem('lang');
    if (stored && Object.prototype.hasOwnProperty.call(translations, stored)) return stored;
  } catch {
    // ignore
  }
  return 'sw';
}

export function t(lang, key, fallback = '') {
  const dict = translations[lang] || translations.en;
  const parts = String(key).split('.');
  let cur = dict;
  for (const p of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
    else return fallback || key;
  }
  return typeof cur === 'string' ? cur : fallback || key;
}

export function createT(lang) {
  return (key, fallback = '') => t(lang, key, fallback);
}

