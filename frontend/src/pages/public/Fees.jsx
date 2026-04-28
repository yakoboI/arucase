/**
 * Fees Page - Full Content from Python Template
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './Fees.css';

const Fees = () => {
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'school-fee'],
    queryFn: () => publicAPI.getPage('school-fee'),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const { data: settings } = useQuery({
    queryKey: ['homepage'],
    queryFn: () => publicAPI.getHomepage(),
    select: (res) => res.data?.settings,
    staleTime: 10 * 60 * 1000,
  });

  const fallbackContent = (
    <div className="fees-page">
      <Link to="/" className="home-button">
        <i className="fas fa-home"></i> Rudi Nyumbani
      </Link>

      <div className="content-card">
        <h1>Muundo wa Ada</h1>
        
        <p>
          <strong>Jibu:</strong> Ada za Seminari ya Kikatoliki Arusha zinajumuisha masomo, malazi, chakula,
          vifaa vya kujifunzia, huduma za afya, programu za malezi ya kiroho, na shughuli za ziada.
          Malipo yanaweza kufanywa kwa mara moja, kwa muhula, au kwa awamu za kila mwezi.
        </p>
        
        <h2>Ada ya Mwaka</h2>
        <p>
          Seminari inajitahidi kudumisha ada zinazomudu kwa wazazi huku ikihakikisha ubora wa elimu na malezi.
          Muundo wa ada unahusisha:
        </p>
        <ul>
          <li>Masomo na ufundishaji</li>
          <li>Malazi (bweni)</li>
          <li>Chakula (milo mitatu kwa siku)</li>
          <li>Vifaa vya kujifunzia</li>
          <li>Huduma za afya</li>
          <li>Programu za malezi ya kiroho</li>
          <li>Shughuli za ziada</li>
        </ul>

        <h3>Ratiba ya Malipo</h3>
        <p>Ada zinaweza kulipwa kwa utaratibu ufuatao:</p>
        <ul>
          <li><strong>Malipo yote kwa pamoja:</strong> Mwanzo wa mwaka wa masomo (kwa punguzo dogo)</li>
          <li><strong>Malipo kwa muhula:</strong> Mwanzo wa kila muhula (awamu 3)</li>
          <li><strong>Malipo ya mwezi:</strong> Kwa awamu za mwezi (kwa makubaliano na mhasibu)</li>
        </ul>

        <h3>Njia za Malipo</h3>
        <ul>
          <li>Uhamisho wa benki kwenda akaunti ya seminari</li>
          <li>Malipo ya simu (M-Pesa, Tigo Pesa, Airtel Money)</li>
          <li>Fedha taslimu ofisini kwa mhasibu</li>
          <li>Hundi (kwa jina la Arusha Catholic Seminary)</li>
        </ul>

        <h3>Ufadhili wa Masomo na Msaada wa Kifedha</h3>
        <p>Seminari hutoa ufadhili na msaada wa kifedha kwa wanafunzi wanaostahili wanaoonyesha:</p>
        <ul>
          <li>Ubora wa kitaaluma</li>
          <li>Mahitaji ya kifedha</li>
          <li>Tabia njema na nidhamu</li>
          <li>Kujitoa kwa dhati katika wito wao</li>
        </ul>

        <h3>Gharama za Ziada</h3>
        <p>Wanafunzi wanaweza kuwa na gharama za ziada kwa:</p>
        <ul>
          <li>Sare za shule na mahitaji binafsi</li>
          <li>Ada za mitihani (mitihani ya serikali)</li>
          <li>Ziara za masomo na matembezi ya hiari</li>
          <li>Gharama binafsi za matibabu</li>
        </ul>

        <h3>Maulizo ya Ada</h3>
        <p>
          Kwa maelezo ya kina kuhusu ada na utaratibu wa malipo, tafadhali wasiliana nasi:<br />
          <strong>Barua pepe:</strong>{' '}
          <a href={`mailto:${settings?.contact_email || 'info@arushacatholicseminary.co.tz'}`} className="contact-link">
            {settings?.contact_email || 'info@arushacatholicseminary.co.tz'}
          </a>
          <br />
          <strong>Simu:</strong>{' '}
          <a href={`tel:${settings?.contact_phone || '+255 123 456 789'}`} className="contact-link">
            {settings?.contact_phone || '+255 123 456 789'}
          </a>
        </p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Loading fees page..." />
      </PublicLayout>
    );
  }

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);

  return (
    <PublicLayout>
      {hasCustomContent ? (
        <div className="fees-page">
          <Link to="/" className="home-button">
            <i className="fas fa-home"></i> Rudi Nyumbani
          </Link>
          <div 
            className="content-card"
            dangerouslySetInnerHTML={{ __html: page.html_content || page.content || '' }}
          />
        </div>
      ) : (
        fallbackContent
      )}
    </PublicLayout>
  );
};

export default Fees;
