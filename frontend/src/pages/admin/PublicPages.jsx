/**
 * Public Pages Management - CRUD for all public website pages
 */
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../utils/toast';
import MDEditor from '@uiw/react-md-editor';
import AdminLayout from '../../components/layout/AdminLayout';
import { adminAPI } from '../../services/admin';
import './PublicWebsite.css';

const PublicPages = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editorHeight, setEditorHeight] = useState(400);
  useEffect(() => {
    const isNarrow = () => window.innerWidth <= 768;
    const update = () => setEditorHeight(isNarrow() ? 280 : 400);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const [editingPage, setEditingPage] = useState(null);
  const [formData, setFormData] = useState({
    page_name: '',
    title: '',
    html_content: '',
  });

  const admissionsDefaultContent = `## Udahili

## Vigezo vya Udahili
Seminari ya Kikatoliki Arusha inapokea vijana wa kiume wenye nia ya kweli ya malezi ya wito na ubora wa kitaaluma. Hivi ni vigezo vya msingi vya udahili:

- Cheti cha ubatizo kutoka Kanisa Katoliki
- Nakala ya matokeo ya masomo kutoka shule aliyosoma
- Barua ya utambulisho kutoka kwa padre wa parokia
- Cheti cha uchunguzi wa afya
- Cheti cha kuzaliwa au kitambulisho halali
- Picha ndogo za pasipoti (nakala 4)

## Utaratibu wa Kutuma Maombi
**Jibu:** Ili kuomba kujiunga na Seminari ya Kikatoliki Arusha, fuata hatua hizi 6:

1. **Pata Fomu ya Maombi:** Pakua mtandaoni au chukua ofisini seminari
2. **Jaza Fomu ya Maombi:** Jaza taarifa zote zinazohitajika kwa usahihi
3. **Wasilisha Nyaraka:** Wasilisha nyaraka zote zinazotakiwa pamoja na fomu yako
4. **Mtihani wa Kuingia:** Hudhuria mtihani wa kuingia uliopangwa
5. **Mahojiano:** Shiriki mahojiano na kamati ya udahili
6. **Uamuzi wa Udahili:** Pokea taarifa ya matokeo ya maombi yako

## Tarehe Muhimu
- **Kipindi cha Maombi:** Januari - Machi
- **Mitihani ya Kuingia:** Aprili
- **Mahojiano:** Mei
- **Barua za Udahili:** Juni
- **Mafunzo ya Utangulizi:** Mwishoni mwa Juni
- **Mwaka wa Masomo Unaaza:** Julai

### Wasiliana na Ofisi ya Udahili
Kwa maelezo zaidi kuhusu udahili, tafadhali wasiliana nasi:

- **Barua pepe:** info@arushacatholicseminary.co.tz
- **Simu:** +255 123 456 789`;

  const aboutDefaultContent = `## Kuhusu Seminari ya Kikatoliki Arusha

Seminari ya Kikatoliki Arusha ni shule ya sekondari ya Kikatoliki iliyoanzishwa mwaka 1967 Oldonyosambu, Tanzania. Tunatoa elimu bora ya Kikatoliki na malezi ya kiroho kwa vijana wa kiume wanaotamani kulitumikia Kanisa na jamii.

## Historia Yetu
Seminari ya Kikatoliki Arusha ilianzishwa mwaka **1967** ikiwa na dhamira ya kutoa elimu bora ya Kikatoliki na malezi ya kiroho kwa vijana wa kiume wanaotamani kulitumikia Kanisa na jamii. Kwa zaidi ya **miongo mitano**, tumekuwa tukilea akili na roho katikati ya Tanzania.

## Dhamira Yetu
**Jibu:** Kuwajenga vijana wa kiume wawe wakomavu kiroho, wabora kitaaluma, na wenye maadili mema ili wawe viongozi wa baadaye katika Kanisa Katoliki na jamii kwa ujumla.

## Maono Yetu
**Jibu:** Kuwa kituo bora cha elimu ya seminari ya Kikatoliki kinachozalisha watu waliokamilika wanaoishi tunu za imani, maarifa, na utumishi.

## Tunu za Msingi
- **Imani:** Kukuza uhusiano na Mungu kupitia sala na sakramenti
- **Ubora wa Kitaaluma:** Kutafuta maarifa kwa bidii na uadilifu
- **Nidhamu:** Kukuza kujitawala na kuwajibika
- **Utumishi:** Kumtumikia Mungu na wanadamu kwa unyenyekevu na upendo
- **Jumuiya:** Kujenga undugu na umoja miongoni mwa wanafunzi wa seminari

### Mlinzi Wetu
Seminari iko chini ya ulinzi wa Mtakatifu Thomas wa Akwino.`;

  const staffDefaultContent = `## Watumishi

## Uongozi
Seminari inaongozwa na timu ya mapadre na watumishi walei waliobobea katika malezi ya jumla ya wanafunzi.

## Watumishi wa Taaluma
Walimu wetu ni wenye sifa na uzoefu katika taaluma zao, wakijitoa kukuza ubora wa masomo na malezi ya kiroho.

## Timu ya Malezi
Timu ya malezi huwasaidia wanafunzi kukua katika maisha ya imani, maadili, na utambuzi wa wito wao.

## Watumishi Wasaidizi
- Matengenezo na usimamizi wa miundombinu
- Jikoni na huduma za chakula
- Maktaba na kituo cha rasilimali
- Huduma za utawala
- Huduma za afya

## Maendeleo ya Watumishi
Seminari inaendeleza mafunzo endelevu kwa watumishi wote ili kuimarisha ubora wa elimu na malezi.`;

  const studentLifeDefaultContent = `## Maisha ya Wanafunzi

## Ratiba ya Kila Siku
Maisha ya seminari yanafuata ratiba iliyopangiliwa inayoweka uwiano kati ya sala, masomo, kazi, na mapumziko:

- **05:30** Sala ya Asubuhi na Misa
- **07:00** Kiamsha kinywa
- **08:00 - 13:00** Vipindi vya masomo
- **13:00** Chakula cha mchana
- **14:00 - 16:00** Kujisomea / shughuli binafsi
- **16:00 - 18:00** Michezo na mapumziko
- **18:30** Chakula cha jioni
- **19:30** Kujisomea jioni
- **21:00** Sala ya usiku
- **22:00** Kulala

## Maisha ya Kiroho
- Misa ya kila siku na ibada ya Ekaristi
- Sala za asubuhi na jioni
- Kitubio cha kila wiki
- Uongozi wa kiroho na ushauri
- Mafungo ya kiroho

## Shughuli za Ziada
- Kwaya na huduma ya muziki
- Michezo
- Tamthilia
- Klabu ya mdahalo
- Uhifadhi wa mazingira
- Miradi ya huduma kwa jamii

## Miundombinu na Huduma
- Kanisa dogo na sehemu za sala
- Madarasa yenye vifaa vya kutosha
- Maktaba na maabara ya kompyuta
- Viwanja na kumbi za michezo
- Mabweni
- Ukumbi wa chakula
- Kituo cha afya`;

  const studentReportDefaultContent = `## Ripoti za Wanafunzi

## Muundo wa Ripoti
Ripoti za wanafunzi hujumuisha:

- Alama za masomo na nafasi/utendaji wa mwanafunzi
- Taarifa ya nafasi ya muhula na utendaji wa jumla
- Maoni ya walimu kwa kila somo
- Maoni ya darasa (Class Teacher) kuhusu maendeleo ya mwanafunzi
- Maoni ya Mkuu wa Shule
- Tathmini ya kiroho
- Taarifa za tabia na mwenendo wa nidhamu

## Ratiba ya Kuripoti
- Ripoti za kila mwezi: taarifa fupi za maendeleo
- Ripoti za katikati ya muhula: tathmini ya kina zaidi
- Ripoti za mwisho wa muhula: ripoti kamili ya masomo na malezi
- Ripoti ya mwaka: muhtasari wa mwaka mzima

## Upatikanaji wa Ripoti
Ripoti hupatikana kupitia:

- Nakala zinazosambazwa mwisho wa muhula
- Mikutano ya wazazi na walimu
- Mfumo wa mtandao (kwa wazazi walioandikishwa)

## Maswali Kuhusu Ripoti
Kwa maswali kuhusu ripoti, wasiliana na ofisi ya shule:

- Barua pepe: info@arushacatholicseminary.co.tz
- Simu: +255 123 456 789`;

  const schoolFeeDefaultContent = `## Ada ya Shule

**Jibu:** Ada za Seminari ya Kikatoliki Arusha zinahusisha masomo, malazi, chakula, vifaa vya kujifunzia, huduma za afya, programu za malezi ya kiroho, na shughuli za ziada. Chaguo za malipo ni kulipa kwa pamoja, kwa muhula, au kwa awamu za kila mwezi.

## Ada ya Mwaka
Seminari inajitahidi kudumisha ada zinazomudu kwa wazazi huku ikihakikisha ubora wa elimu na malezi. Muundo wa ada unahusisha:

## Vipengele vya Ada
- Masomo na ufundishaji
- Malazi (bweni)
- Chakula (milo mitatu kwa siku)
- Vifaa vya kujifunzia
- Huduma za afya
- Programu za malezi ya kiroho
- Shughuli za ziada

## Ratiba ya Malipo
- **Malipo yote kwa pamoja:** Mwanzo wa mwaka wa masomo (kwa punguzo dogo)
- **Malipo kwa muhula:** Mwanzo wa kila muhula (awamu 3)
- **Malipo ya mwezi:** Kwa awamu za mwezi (kwa makubaliano na ofisi ya mhasibu)

## Njia za Malipo
- Uhamisho wa benki kwenda akaunti ya seminari
- Malipo ya simu (M-Pesa, Tigo Pesa, Airtel Money)
- Fedha taslimu ofisini kwa mhasibu
- Hundi (kwa jina la Arusha Catholic Seminary)

## Ufadhili wa Masomo na Msaada wa Kifedha
Seminari hutoa ufadhili na msaada wa kifedha kwa wanafunzi wanaostahili wanaoonyesha:

- Ubora wa kitaaluma
- Mahitaji ya kifedha
- Tabia njema na nidhamu
- Kujitoa kwa dhati katika wito wao

## Gharama za Ziada
Wanafunzi wanaweza kuwa na gharama za ziada kwa:

- Sare za shule na mahitaji binafsi
- Ada za mitihani (mitihani ya serikali)
- Ziara za masomo na matembezi ya hiari
- Gharama binafsi za matibabu

## Mawasiliano ya Ada
Kwa maelezo ya kina kuhusu ada na utaratibu wa malipo:
- **Barua pepe:** info@arushacatholicseminary.co.tz
- **Simu:** +255 123 456 789`;

  const contactDefaultContent = `## Mawasiliano

## Wasiliana Nasi
Tunakaribisha mawasiliano kutoka kwa wanafunzi watarajiwa, wazazi, wahitimu, na marafiki wa seminari.

## Taarifa za Mawasiliano
- **Anwani:** Arusha Catholic Seminary, S.L.P. 1234, Arusha, Tanzania
- **Simu:** +255 123 456 789
- **Barua pepe:** info@arushacatholicseminary.co.tz
- **WhatsApp:** +255 123 456 789

## Saa za Ofisi
- **Jumatatu - Ijumaa:** 08:00 - 16:00
- **Jumamosi:** 09:00 - 12:00
- **Jumapili:** Ofisi imefungwa
- **Sikukuu za Umma:** Ofisi imefungwa

## Tembelea Seminari
Wageni wanakaribishwa kutembelea kwa miadi. Tafadhali wasiliana nasi mapema kupanga ziara.`;

  const privacyDefaultContent = `## Sera ya Faragha

Imesasishwa mwisho: 13 Oktoba 2025

## Utangulizi
Seminari ya Kikatoliki Arusha imejizatiti kulinda faragha yako. Sera hii inaeleza taarifa tunazokusanya, sababu za kuzikusanya, na namna tunavyozilinda unapotumia tovuti yetu.

## Taarifa Tunazokusanya
### Taarifa unazotoa mwenyewe
- Maelezo ya mawasiliano (jina, barua pepe, simu)
- Taarifa za wahitimu (mwaka wa kuhitimu, taaluma, ushuhuda)
- Taarifa za matukio ya shule

### Taarifa zinazokusanywa kiotomatiki
- Anuani ya IP, aina ya kifaa, na aina ya kivinjari
- Kurasa ulizotembelea na muda wa matumizi
- Takwimu za wageni na mwenendo wa trafiki

## Jinsi Tunavyotumia Taarifa
- Kutoa na kuboresha huduma za tovuti
- Kujibu maswali na maombi
- Kulinda usalama wa mfumo
- Kuboresha uzoefu wa mtumiaji

## Vidakuzi na Ufuatiliaji
- Vidakuzi vya kipindi cha matumizi
- Hifadhi ya mapendeleo ya mtumiaji
- Ufuatiliaji wa takwimu za matumizi

## Haki Zako
Unaweza kuomba:
- Kupata nakala ya taarifa zako binafsi.
- Kurekebisha taarifa zisizo sahihi.
- Kufuta taarifa pale inapowezekana kisheria.
- Kuondoa ridhaa ya uchakataji wa data.

Kutuma ombi, wasiliana kupitia **arucase@gmail.com**.

## Mawasiliano
- **Barua pepe:** arucase@gmail.com
- **Simu:** +255 754 926 022
- **Anwani:** Seminari ya Kikatoliki Arusha, Arusha, Tanzania`;

  const defaultTemplates = {
    about: aboutDefaultContent,
    admissions: admissionsDefaultContent,
    staff: staffDefaultContent,
    'student-life': studentLifeDefaultContent,
    'student_life': studentLifeDefaultContent, // alias slug (backend-known)
    'student_report': studentReportDefaultContent,
    'school-fee': schoolFeeDefaultContent,
    fees: schoolFeeDefaultContent, // alias slug (backend-known)
    contact: contactDefaultContent,
    privacy: privacyDefaultContent,
  };

  // Available public pages for content management
  const availablePages = [
    { name: 'about', label: 'Kuhusu Sisi', icon: 'fa-info-circle', description: 'Taarifa kuhusu Seminari ya Kikatoliki Arusha', color: 'blue' },
    { name: 'admissions', label: 'Udahili', icon: 'fa-user-plus', description: 'Vigezo na utaratibu wa udahili', color: 'green' },
    { name: 'staff', label: 'Watumishi', icon: 'fa-users', description: 'Taarifa za watumishi wa shule', color: 'orange' },
    { name: 'student-life', label: 'Maisha ya Wanafunzi', icon: 'fa-heart', description: 'Maisha na shughuli za wanafunzi', color: 'red' },
    { name: 'student_life', label: 'Maisha ya Wanafunzi (Alias)', icon: 'fa-heart', description: 'Maisha na shughuli za wanafunzi (slug ya alias)', color: 'red' },
    { name: 'student_report', label: 'Ripoti za Wanafunzi', icon: 'fa-file-alt', description: 'Taarifa za mfumo wa ripoti za wanafunzi', color: 'blue' },
    { name: 'school-fee', label: 'Ada ya Shule', icon: 'fa-money-bill-wave', description: 'Muundo wa ada na malipo', color: 'green' },
    { name: 'fees', label: 'Ada (Alias)', icon: 'fa-money-bill-wave', description: 'Muundo wa ada na malipo (slug ya alias)', color: 'green' },
    { name: 'contact', label: 'Mawasiliano', icon: 'fa-envelope', description: 'Taarifa za mawasiliano na fomu', color: 'green' },
    { name: 'privacy', label: 'Sera ya Faragha', icon: 'fa-shield-alt', description: 'Usimamizi wa maudhui ya sera ya faragha', color: 'blue' },
  ];

  // Fetch all public pages
  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['admin-public-pages'],
    queryFn: async () => {
      const res = await adminAPI.getPublicPages();
      return res.data.pages || [];
    },
  });

  // Save page mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return adminAPI.savePublicPage(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-public-pages']);
      toast.success(`Ukurasa ${editingPage ? 'umesasishwa' : 'umeundwa'} kwa mafanikio!`);
      setShowModal(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Imeshindikana kuhifadhi ukurasa');
    },
  });

  // Delete page mutation
  const deleteMutation = useMutation({
    mutationFn: async (pageName) => adminAPI.deletePublicPage(pageName),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-public-pages']);
      toast.success('Maudhui ya ukurasa yamefutwa. Ukurasa wa umma sasa unatumia maudhui chaguomsingi.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Imeshindikana kufuta maudhui ya ukurasa');
    },
  });

  const resetForm = () => {
    setFormData({
      page_name: '',
      title: '',
      html_content: '',
    });
    setEditingPage(null);
  };

  const handleAdd = (pageName) => {
    const pageInfo = availablePages.find(p => p.name === pageName);
    resetForm();
    setFormData({
      page_name: pageName,
      title: pageInfo?.label || pageName,
      html_content: defaultTemplates[pageName] || '',
    });
    setShowModal(true);
  };

  const applyTemplate = (pageName) => {
    const tpl = defaultTemplates[pageName];
    if (!tpl) return;
    setFormData((prev) => ({ ...prev, html_content: tpl }));
    toast.info('Kiolezo cha msingi kimewekwa. Unaweza kuhariri kabla ya kuhifadhi.');
  };

  const handleDelete = (pageName) => {
    const ok = window.confirm(
      `Unataka kufuta maudhui yaliyohifadhiwa ya "${pageName}"?\n\nUkurasa wa umma utarudi mara moja kwenye maudhui chaguomsingi.`
    );
    if (!ok) return;
    deleteMutation.mutate(pageName);
  };

  const handleEdit = (page) => {
    setEditingPage(page);
    setFormData({
      page_name: page.page_name,
      title: page.title || '',
      html_content: page.html_content || '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.page_name.trim() || !formData.title.trim() || !formData.html_content.trim()) {
      toast.error('Jina la ukurasa, kichwa na maudhui vinahitajika');
      return;
    }
    
    saveMutation.mutate(formData);
  };

  const getPageInfo = (pageName) => {
    return availablePages.find(p => p.name === pageName) || { label: pageName, icon: 'fa-file', description: '', color: 'blue' };
  };

  const getExistingPage = (pageName) => {
    return pages.find(p => p.page_name === pageName);
  };

  return (
    <AdminLayout>
      <div className="public-website-page-container">
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-globe"></i>
            Usimamizi wa Kurasa za Umma
          </div>
          <div className="excel-card-body">
            {isLoading ? (
              <div className="loading-state">Inapakia kurasa...</div>
            ) : (
              <>
                <div className="management-grid">
                  {availablePages.map((pageInfo) => {
                    const existingPage = getExistingPage(pageInfo.name);
                    const colorClass = `card-header-gradient-${pageInfo.color || 'blue'}`;
                    return (
                      <div key={pageInfo.name} className="admin-card admin-public-website-card">
                        <i className="fas fa-check-circle admin-public-website-hover-tick"></i>
                        <div className={`admin-card-header ${colorClass}`}>
                          <h3>
                            <i className={`fas ${pageInfo.icon}`}></i>
                            <span>{pageInfo.label}</span>
                          </h3>
                        </div>
                        <div className="admin-card-body">
                          <p>{pageInfo.description}</p>
                          {existingPage ? (
                            <div style={{ marginBottom: '1rem' }}>
                              <span className="status-badge badge-active">
                                <i className="fas fa-check-circle"></i> Maudhui Yapo
                              </span>
                            </div>
                          ) : (
                            <div style={{ marginBottom: '1rem' }}>
                              <span className="status-badge badge-warning">
                                <i className="fas fa-exclamation-triangle"></i> Hakuna Maudhui
                              </span>
                            </div>
                          )}
                          <div className="public-page-card-actions">
                            {existingPage ? (
                              <>
                                <button
                                  onClick={() => handleEdit(existingPage)}
                                  className={`admin-btn admin-btn-${pageInfo.color || 'primary'}`}
                                >
                                  <i className="fas fa-edit"></i> Hariri
                                </button>
                                <button
                                  onClick={() => handleDelete(pageInfo.name)}
                                  className="admin-btn admin-btn-danger"
                                  disabled={deleteMutation.isLoading}
                                >
                                  <i className="fas fa-trash"></i> Futa
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleAdd(pageInfo.name)}
                                className="admin-btn admin-btn-success"
                              >
                                <i className="fas fa-plus"></i> Unda
                              </button>
                            )}
                            <a
                              href={`/${pageInfo.name}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-btn admin-btn-purple"
                            >
                              <i className="fas fa-external-link-alt"></i> Tazama
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Modal for editing/creating pages */}
                {showModal && (
                  <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                      <div className="modal-header">
                        <h3>
                          <i className={`fas ${getPageInfo(formData.page_name).icon}`}></i>
                          {editingPage ? 'Hariri' : 'Unda'} Ukurasa wa {getPageInfo(formData.page_name).label}
                        </h3>
                        <button className="modal-close" onClick={() => setShowModal(false)}>
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
                        <div className="form-group">
                          <label>Jina la Ukurasa</label>
                          <input
                            type="text"
                            value={formData.page_name}
                            readOnly
                            disabled={!!editingPage}
                            className="excel-input"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Kichwa</label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="excel-input"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Maudhui ya Ukurasa</label>
                          {defaultTemplates[formData.page_name] ? (
                            <div style={{ marginBottom: '0.5rem' }}>
                              <button
                                type="button"
                                className="excel-btn secondary"
                                onClick={() => applyTemplate(formData.page_name)}
                              >
                                <i className="fas fa-file-alt"></i> Tumia Kiolezo cha Msingi
                              </button>
                            </div>
                          ) : null}
                          <div className="rich-text-editor-wrapper">
                            <MDEditor
                              value={formData.html_content}
                              onChange={(content) => setFormData({ ...formData, html_content: content || '' })}
                              height={editorHeight}
                              preview="edit"
                              hideToolbar={false}
                            />
                          </div>
                          <small style={{ color: '#6b7280', marginTop: '0.5rem', display: 'block' }}>
                            Tumia mtindo wa Markdown kupanga maudhui yako. Maudhui yataonekana kwenye ukurasa wa umma.
                          </small>
                        </div>
                        {formData.html_content && (
                          <div className="form-group">
                            <label>Hakiki</label>
                            <div 
                              className="content-preview"
                              dangerouslySetInnerHTML={{ __html: formData.html_content }}
                            />
                          </div>
                        )}
                        <div className="form-actions">
                          <button type="submit" className="excel-btn primary" disabled={saveMutation.isLoading}>
                            <i className="fas fa-save"></i> {saveMutation.isLoading ? 'Inahifadhi...' : 'Hifadhi Ukurasa'}
                          </button>
                          <button type="button" className="excel-btn secondary" onClick={() => setShowModal(false)}>
                            <i className="fas fa-times"></i> Ghairi
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PublicPages;

