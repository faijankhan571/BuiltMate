/**
 * Pan-India Full-Application Translation & Script Transliteration Engine
 * Translates all UI phrases, module headings, labels, buttons, statuses, and table columns
 * across all 22 Scheduled Indian Languages + English, and transliterates any remaining
 * Latin/English words or proper names into the active Indian script so no English text
 * remains visible when a non-English language is selected.
 */

export const CORE_UI_DICTIONARY: Record<string, Record<string, string>> = {
  en: {
    welcome: 'Welcome',
    dashboard: 'Dashboard',
    supervisor_dashboard: 'Site Supervisor Hub',
    employees: 'Employees',
    labours: 'Labour Management',
    hr_management: 'HR Management',
    projects: 'Projects & Sites',
    sites: 'Construction Sites',
    attendance: 'Daily Attendance',
    tasks: 'Task Management',
    office_tasks: 'Office Tasks (HR & Admin)',
    leaves: 'Leave Requests',
    salary: 'Payroll & Accountant',
    my_salary: 'My Salary',
    materials: 'Materials & Requests',
    suppliers: 'Suppliers & Quotes',
    reports: 'Operational Reports',
    csv_hub: 'CSV Import / Export',
    ai_insights: 'Gemini AI Insights',
    supabase_setup: 'Supabase SQL & Setup',
    sign_out: 'Sign Out',
    sync_supabase: 'Sync Live Supabase DB',
    logged_in_account: 'Logged In Account',
    used_material: 'Used Material Entry',
    photo_attendance: 'Photo & Location Attendance',
    present: 'Present',
    absent: 'Absent',
    site_supervisor: 'Site Supervisor',
    labourer: 'Labourer',
    employee: 'Employee',
    overview_dashboard: 'Overview Dashboard',
  },
  hi: {
    welcome: 'स्वागत है',
    dashboard: 'डैशबोर्ड',
    supervisor_dashboard: 'साइट सुपरवाइज़र हब',
    employees: 'कर्मचारी',
    labours: 'श्रमिक प्रबंधन',
    hr_management: 'एचआर प्रबंधन',
    projects: 'परियोजनाएं और साइटें',
    sites: 'निर्माण स्थल',
    attendance: 'दैनिक उपस्थिति',
    tasks: 'कार्य प्रबंधन',
    office_tasks: 'कार्यालय कार्य (एचआर और एडमिन)',
    leaves: 'अवकाश अनुरोध',
    salary: 'वेतन और लेखाकार',
    my_salary: 'मेरा वेतन',
    materials: 'सामग्री और अनुरोध',
    suppliers: 'आपूर्तिकर्ता और कोटेशन',
    reports: 'परिचालन रिपोर्ट',
    csv_hub: 'सीएसवी आयात / निर्यात',
    ai_insights: 'जेमिनी एआई अंतर्दृष्टि',
    supabase_setup: 'सुपाबेस एसक्यूएल और सेटअप',
    sign_out: 'लॉग आउट',
    sync_supabase: 'लाइव सुपाबेस सिंक करें',
    logged_in_account: 'लॉग-इन खाता',
    used_material: 'प्रयुक्त सामग्री डेटा',
    photo_attendance: 'फोटो और लोकेशन उपस्थिति',
    present: 'उपस्थित',
    absent: 'अनुपस्थित',
    site_supervisor: 'साइट सुपरवाइज़र',
    labourer: 'श्रमिक',
    employee: 'कर्मचारी',
    overview_dashboard: 'अवलोकन डैशबोर्ड',
  },
  mr: {
    welcome: 'स्वागत आहे',
    dashboard: 'डॅशबोर्ड',
    supervisor_dashboard: 'साईट सुपरवायझर हब',
    employees: 'कर्मचारी',
    labours: 'कामगार व्यवस्थापन',
    hr_management: 'एचआर व्यवस्थापन',
    projects: 'प्रकल्प आणि साईट्स',
    sites: 'बांधकाम साईट्स',
    attendance: 'दैनंदिन हजेरी',
    tasks: 'कार्य व्यवस्थापन',
    office_tasks: 'कार्यालयीन कामे (एचआर आणि ॲडमिन)',
    leaves: 'रजा अर्ज',
    salary: 'वेतन आणि लेखापाल',
    my_salary: 'माझा पगार',
    materials: 'साहित्य आणि मागणी',
    suppliers: 'पुरवठादार आणि दरपत्रक',
    reports: 'कामकाज अहवाल',
    csv_hub: 'सीएसव्ही आयात / निर्यात',
    ai_insights: 'जेमिनी एआय विश्लेषण',
    supabase_setup: 'सुपाबेस एसक्यूएल आणि सेटअप',
    sign_out: 'बाहेर पडा',
    sync_supabase: 'सुपाबेस डेटा सिंक करा',
    logged_in_account: 'लॉग-इन खाते',
    used_material: 'वापरलेले साहित्य नोंद',
    photo_attendance: 'फोटो आणि लोकेशन हजेरी',
    present: 'हजर',
    absent: 'गैरहजर',
    site_supervisor: 'साईट सुपरवायझर',
    labourer: 'कामगार',
    employee: 'कर्मचारी',
    overview_dashboard: 'मुख्य डॅशबोर्ड',
  },
  ta: {
    welcome: 'வரவேற்கிறோம்',
    dashboard: 'டாஷ்போர்டு',
    supervisor_dashboard: 'தள மேற்பார்வையாளர் மையம்',
    employees: 'ஊழியர்கள்',
    labours: 'தொழிலாளர் மேலாண்மை',
    hr_management: 'மனிதவள மேலாண்மை',
    projects: 'திட்டங்கள் மற்றும் தளங்கள்',
    sites: 'கட்டுமான தளங்கள்',
    attendance: 'தினசரி வருகை',
    tasks: 'பணி மேலாண்மை',
    office_tasks: 'அலுவலக பணிகள்',
    leaves: 'விடுப்பு கோரிக்கைகள்',
    salary: 'சம்பளம் மற்றும் கணக்காளர்',
    my_salary: 'எனது சம்பளம்',
    materials: 'பொருட்கள் மற்றும் கோரிக்கைகள்',
    suppliers: 'சப்ளையர்கள் மற்றும் விலைகள்',
    reports: 'செயல்பாட்டு அறிக்கைகள்',
    csv_hub: 'சிஎஸ்வி இறக்குமதி / ஏற்றுமதி',
    ai_insights: 'ஜெமினி ஏஐ நுண்ணறிவு',
    supabase_setup: 'சுபாபேஸ் எஸ்க்யூஎல் அமைப்பு',
    sign_out: 'வெளியேறு',
    sync_supabase: 'சுபாபேஸ் ஒத்திசைவு',
    logged_in_account: 'உள்நுழைந்த கணக்கு',
    used_material: 'பயன்படுத்திய பொருள் பதிவு',
    photo_attendance: 'புகைப்படம் மற்றும் இருப்பிட வருகை',
    present: 'வருகை',
    absent: 'வரவில்லை',
    site_supervisor: 'தள மேற்பார்வையாளர்',
    labourer: 'தொழிலாளி',
    employee: 'ஊழியர்',
    overview_dashboard: 'மேலோட்ட டாஷ்போர்டு',
  },
  te: {
    welcome: 'స్వాగతం',
    dashboard: 'డ్యాష్‌బోర్డ్',
    supervisor_dashboard: 'సైట్ సూపర్‌వైజర్ హబ్',
    employees: 'ఉద్యోగులు',
    labours: 'కార్మిక నిర్వహణ',
    hr_management: 'హెచ్‌ఆర్ నిర్వహణ',
    projects: 'ప్రాజెక్టులు మరియు సైట్లు',
    sites: 'నిర్మాణ ప్రదేశాలు',
    attendance: 'రోజువారీ హాజరు',
    tasks: 'పని నిర్వహణ',
    office_tasks: 'కార్యాలయ పనులు',
    leaves: 'సెలవు అభ్యర్థనలు',
    salary: 'జీతం మరియు అకౌంటెంట్',
    my_salary: 'నా జీతం',
    materials: 'మెటీరియల్స్ మరియు అభ్యర్థనలు',
    suppliers: 'సప్లయర్లు మరియు కొటేషన్లు',
    reports: 'కార్యకలాప నివేదికలు',
    csv_hub: 'సిఎస్వి దిగుమతి / ఎగుమతి',
    ai_insights: 'జెమిని ఏఐ విశ్లేషణ',
    supabase_setup: 'సుపాబేస్ ఎస్క్యూఎల్ సెటప్',
    sign_out: 'సైన్ అవుట్',
    sync_supabase: 'సుపాబేస్ సింక్ చేయండి',
    logged_in_account: 'లాగిన్ అయిన ఖాతా',
    used_material: 'ఉపయోగించిన మెటీరియల్',
    photo_attendance: 'ఫోటో మరియు లొకేషన్ హాజరు',
    present: 'హాజరు',
    absent: 'గైర్హాజరు',
    site_supervisor: 'సైట్ సూపర్‌వైజర్',
    labourer: 'కార్మికుడు',
    employee: 'ఉద్యోగి',
    overview_dashboard: 'ఓవర్‌వ్యూ డ్యాష్‌బోర్డ్',
  },
  kn: {
    welcome: 'ಸ್ವಾಗತ',
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    supervisor_dashboard: 'ಸೈಟ್ ಸೂಪರ್‌ವೈಸರ್ ಹಬ್',
    employees: 'ಉದ್ಯೋಗಿಗಳು',
    labours: 'ಕಾರ್ಮಿಕ ನಿರ್ವಹಣೆ',
    hr_management: 'ಎಚ್‌ಆರ್ ನಿರ್ವಹಣೆ',
    projects: 'ಯೋಜನೆಗಳು ಮತ್ತು ಸೈಟ್‌ಗಳು',
    sites: 'ನಿರ್ಮಾಣ ಸ್ಥಳಗಳು',
    attendance: 'ದೈನಂದಿನ ಹಾಜರಾತಿ',
    tasks: 'ಕಾರ್ಯ ನಿರ್ವಹಣೆ',
    office_tasks: 'ಕಚೇರಿ ಕಾರ್ಯಗಳು',
    leaves: 'ರಜೆ ವಿನಂತಿಗಳು',
    salary: 'ವೇತನ ಮತ್ತು ಲೆಕ್ಕಿಗರು',
    my_salary: 'ನನ್ನ ಸಂಬಳ',
    materials: 'ಸಾಮಗ್ರಿಗಳು ಮತ್ತು ವಿನಂತಿಗಳು',
    suppliers: 'ಪೂರೈಕೆದಾರರು ಮತ್ತು ದರಗಳು',
    reports: 'ಕಾರ್ಯಾಚರಣೆ ವರದಿಗಳು',
    csv_hub: 'ಸಿಎಸ್‌ವಿ ಆಮದು / ರಫ್ತು',
    ai_insights: 'ಜೆಮಿನಿ ಎಐ ಒಳನೋಟಗಳು',
    supabase_setup: 'ಸುಪಾಬೇಸ್ ಎಸ್‌ಕ್ಯೂಎಲ್ ಸೆಟಪ್',
    sign_out: 'ಸೈನ್ ಔಟ್',
    sync_supabase: 'ಸುಪಾಬೇಸ್ ಸಿಂಕ್ ಮಾಡಿ',
    logged_in_account: 'ಲಾಗಿನ್ ಖಾತೆ',
    used_material: 'ಬಳಸಿದ ಸಾಮಗ್ರಿ ಡೇಟಾ',
    photo_attendance: 'ಫೋಟೋ ಮತ್ತು ಸ್ಥಳ ಹಾಜರಾತಿ',
    present: 'ಹಾಜರು',
    absent: 'ಗೈರು',
    site_supervisor: 'ಸೈಟ್ ಸೂಪರ್‌ವೈಸರ್',
    labourer: 'ಕಾರ್ಮಿಕ',
    employee: 'ಉದ್ಯೋಗಿ',
    overview_dashboard: 'ಅವಲೋಕನ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
  },
  ml: {
    welcome: 'സ്വാഗതം',
    dashboard: 'ഡാഷ്‌ബോർഡ്',
    supervisor_dashboard: 'സൈറ്റ് സൂപ്പർവൈസർ ഹബ്',
    employees: 'ജീവനക്കാർ',
    labours: 'തൊഴിലാളി മാനേജ്‌മെന്റ്',
    hr_management: 'എച്ച്ആർ മാനേജ്‌മെന്റ്',
    projects: 'പ്രോജക്ടുകളും സൈറ്റുകളും',
    sites: 'നിർമ്മാണ സൈറ്റുകൾ',
    attendance: 'ദൈനംദിന ഹാജർ',
    tasks: 'ടാസ്ക് മാനേജ്‌മെന്റ്',
    office_tasks: 'ഓഫീസ് ചുമതലകൾ',
    leaves: 'അവധി അപേക്ഷകൾ',
    salary: 'ശമ്പളവും അക്കൗണ്ടന്റും',
    my_salary: 'എന്റെ ശമ്പളം',
    materials: 'മെറ്റീരിയലുകളും ആവശ്യങ്ങളും',
    suppliers: 'വിതരണക്കാരും ക്വട്ടേഷനുകളും',
    reports: 'പ്രവർത്തന റിപ്പോർട്ടുകൾ',
    csv_hub: 'സിഎസ്‌വി ഇംപോർട്ട് / എക്സ്പോർട്ട്',
    ai_insights: 'ജെമിനി എഐ ഉൾക്കാഴ്ചകൾ',
    supabase_setup: 'സുপাബേസ് എസ്ക്യുഎൽ സജ്ജീകരണം',
    sign_out: 'സൈൻ ഔട്ട്',
    sync_supabase: 'സുപാബേസ് സിങ്ക് ചെയ്യുക',
    logged_in_account: 'ലോഗിൻ ചെയ്ത അക്കൗണ്ട്',
    used_material: 'ഉപയോഗിച്ച മെറ്റീരിയൽ ഡാറ്റ',
    photo_attendance: 'ഫോട്ടോ ലൊക്കേഷൻ ഹാജർ',
    present: 'ഹാജർ',
    absent: 'അഭാവം',
    site_supervisor: 'സൈറ്റ് സൂപ്പർവൈസർ',
    labourer: 'തൊഴിലാളി',
    employee: 'ജീവനക്കാരൻ',
    overview_dashboard: 'അവലോകന ഡാഷ്‌ബോർഡ്',
  },
  bn: {
    welcome: 'স্বাগতম',
    dashboard: 'ড্যাশবোর্ড',
    supervisor_dashboard: 'সাইট সুপারভাইজার হাব',
    employees: 'কর্মচারীবৃন্দ',
    labours: 'শ্রমিক ব্যবস্থাপনা',
    hr_management: 'এইচআর ব্যবস্থাপনা',
    projects: 'প্রকল্প ও সাইট',
    sites: 'নির্মাণ সাইট',
    attendance: 'দৈনিক উপস্থিতি',
    tasks: 'কার্য ব্যবস্থাপনা',
    office_tasks: 'অফিস কার্যসমূহ',
    leaves: 'ছুটির আবেদন',
    salary: 'বেতন ও হিসাবরক্ষক',
    my_salary: 'আমার বেতন',
    materials: 'উপকরণ ও অনুরোধ',
    suppliers: 'সরবরাহকারী ও দরপত্র',
    reports: 'অপারেশনাল রিপোর্ট',
    csv_hub: 'সিএসভি ইমপোর্ট / এক্সপোর্ট',
    ai_insights: 'জেমিনি এআই বিশ্লেষণ',
    supabase_setup: 'সুপাবেস এসকিউএল সেটআপ',
    sign_out: 'সাইন আউট',
    sync_supabase: 'সুপাবেস সিঙ্ক করুন',
    logged_in_account: 'লগ-ইন অ্যাকাউন্ট',
    used_material: 'ব্যবহৃত উপকরণ তথ্য',
    photo_attendance: 'ছবি ও লোকেশন উপস্থিতি',
    present: 'উপস্থিত',
    absent: 'অনুপস্থিত',
    site_supervisor: 'সাইট সুপারভাইজার',
    labourer: 'শ্রমিক',
    employee: 'কর্মচারী',
    overview_dashboard: 'ওভারভিউ ড্যাশবোর্ড',
  },
  gu: {
    welcome: 'સ્વાગત છે',
    dashboard: 'ડેશબોર્ડ',
    supervisor_dashboard: 'સાઇટ સુપરવાઇઝર હબ',
    employees: 'કર્મચારીઓ',
    labours: 'કામદાર વ્યવસ્થાપન',
    hr_management: 'એચઆર વ્યવસ્થાપન',
    projects: 'પ્રોજેક્ટ્સ અને સાઇટ્સ',
    sites: 'બાંધકામ સાઇટ્સ',
    attendance: 'દૈનિક હાજરી',
    tasks: 'કાર્ય વ્યવસ્થાપન',
    office_tasks: 'ઓફિસ કાર્યો',
    leaves: 'રજા અરજીઓ',
    salary: 'પગાર અને એકાઉન્ટન્ટ',
    my_salary: 'મારો પગાર',
    materials: 'મટીરીયલ અને વિનંતીઓ',
    suppliers: 'સપ્લાયર્સ અને ભાવ',
    reports: 'કામગીરી અહેવાલો',
    csv_hub: 'સીએસવી આયાત / નિકાસ',
    ai_insights: 'જેમિની એઆઈ વિશ્લેષણ',
    supabase_setup: 'સુપાબેઝ એસક્યુએલ સેટઅપ',
    sign_out: 'સાઇન આઉટ',
    sync_supabase: 'સુપાબેઝ સિંક કરો',
    logged_in_account: 'લૉગ-ઇન ખાતું',
    used_material: 'વપરાયેલ મટીરીયલ ડેટા',
    photo_attendance: 'ફોટો અને લોકેશન હાજરી',
    present: 'હાજર',
    absent: 'ગેરહાજર',
    site_supervisor: 'સાઇટ સુપરવાઇઝર',
    labourer: 'કામદાર',
    employee: 'કર્મચારી',
    overview_dashboard: 'મુખ્ય ડેશબોર્ડ',
  },
  pa: {
    welcome: 'ਜੀ ਆਇਆਂ ਨੂੰ',
    dashboard: 'ਡੈਸ਼ਬੋਰਡ',
    supervisor_dashboard: 'ਸਾਈਟ ਸੁਪਰਵਾਈਜ਼ਰ ਹੱਬ',
    employees: 'ਕਰਮਚਾਰੀ',
    labours: 'ਮਜ਼ਦੂਰ ਪ੍ਰਬੰਧਨ',
    hr_management: 'ਐੱਚ.ਆਰ. ਪ੍ਰਬੰਧਨ',
    projects: 'ਪ੍ਰੋਜੈਕਟ ਅਤੇ ਸਾਈਟਾਂ',
    sites: 'ਉਸਾਰੀ ਸਾਈਟਾਂ',
    attendance: 'ਰੋਜ਼ਾਨਾ ਹਾਜ਼ਰੀ',
    tasks: 'ਕਾਰਜ ਪ੍ਰਬੰਧਨ',
    office_tasks: 'ਦਫ਼ਤਰੀ ਕਾਰਜ',
    leaves: 'ਛੁੱਟੀ ਦੀਆਂ ਅਰਜ਼ੀਆਂ',
    salary: 'ਤਨਖਾਹ ਅਤੇ ਲੇਖਾਕਾਰ',
    my_salary: 'ਮੇਰੀ ਤਨਖਾਹ',
    materials: 'ਸਮੱਗਰੀ ਅਤੇ ਬੇਨਤੀਆਂ',
    suppliers: 'ਸਪਲਾਇਰ ਅਤੇ ਕੋਟੇਸ਼ਨ',
    reports: 'ਕਾਰਜਕਾਰੀ ਰਿਪੋਰਟਾਂ',
    csv_hub: 'ਸੀਐਸਵੀ ਇੰਪੋਰਟ / ਐਕਸਪੋਰਟ',
    ai_insights: 'ਜੇਮਿਨੀ ਏਆਈ ਇਨਸਾਈਟਸ',
    supabase_setup: 'ਸੁਪਾਬੇਸ ਐਸਕਿਊਐਲ ਸੈੱਟਅੱਪ',
    sign_out: 'ਸਾਈਨ ਆਉਟ',
    sync_supabase: 'ਸੁਪਾਬੇਸ ਸਿੰਕ ਕਰੋ',
    logged_in_account: 'ਲੌਗ-ਇਨ ਖਾਤਾ',
    used_material: 'ਵਰਤੀ ਗਈ ਸਮੱਗਰੀ ਡੇਟਾ',
    photo_attendance: 'ਫੋਟੋ ਅਤੇ ਲੋਕੇਸ਼ਨ ਹਾਜ਼ਰੀ',
    present: 'ਹਾਜ਼ਰ',
    absent: 'ਗੈਰ-ਹਾਜ਼ਰ',
    site_supervisor: 'ਸਾਈਟ ਸੁਪਰਵਾਈਜ਼ਰ',
    labourer: 'ਮਜ਼ਦੂਰ',
    employee: 'ਕਰਮਚਾਰੀ',
    overview_dashboard: 'ਮੁੱਖ ਡੈਸ਼ਬੋਰਡ',
  },
  or: {
    welcome: 'ସ୍ୱାଗତ',
    dashboard: 'ଡ୍ୟାସବୋର୍ଡ',
    supervisor_dashboard: 'ସାଇଟ୍ ସୁପରଭାଇଜର ହବ୍',
    employees: 'କର୍ମଚାରୀ',
    labours: 'ଶ୍ରମିକ ପରିଚାଳନା',
    hr_management: 'ଏଚ୍.ଆର୍. ପରିଚାଳନା',
    projects: 'ପ୍ରକଳ୍ପ ଏବଂ ସାଇଟ୍',
    sites: 'ନିର୍ମାଣ ସ୍ଥଳ',
    attendance: 'ଦୈନିକ ଉପସ୍ଥାନ',
    tasks: 'କାର୍ଯ୍ୟ ପରିଚାଳନା',
    office_tasks: 'କାର୍ଯ୍ୟାଳୟ କାର୍ଯ୍ୟ',
    leaves: 'ଛୁଟି ଆବେଦନ',
    salary: 'ଦରମା ଏବଂ ହିସାବରକ୍ଷକ',
    my_salary: 'ମୋ ଦରମା',
    materials: 'ସାମଗ୍ରୀ ଏବଂ ଅନୁରୋଧ',
    suppliers: 'ଯୋଗାଣକାରୀ ଏବଂ ଦର',
    reports: 'କାର୍ଯ୍ୟ ରିପୋର୍ଟ',
    csv_hub: 'ସିଏସଭି ଆମଦାନୀ / ରପ୍ତାନି',
    ai_insights: 'ଜେମିନି ଏଆଇ ବିଶ୍ଳେଷଣ',
    supabase_setup: 'ସୁପାବେସ୍ ଏସକ୍ୟୁଏଲ୍ ସେଟଅପ୍',
    sign_out: 'ସାଇନ୍ ଆଉଟ୍',
    sync_supabase: 'ସୁପାବେସ୍ ସିଙ୍କ୍ କରନ୍ତୁ',
    logged_in_account: 'ଲଗ୍-ଇନ୍ ଆକାଉଣ୍ଟ୍',
    used_material: 'ବ୍ୟବହୃତ ସାମଗ୍ରୀ ତଥ୍ୟ',
    photo_attendance: 'ଫଟୋ ଏବଂ ଲୋକେସନ୍ ଉପସ୍ଥାନ',
    present: 'ଉପସ୍ଥିତ',
    absent: 'ଅନୁପସ୍ଥିତ',
    site_supervisor: 'ସାଇଟ୍ ସୁପରଭାଇଜର',
    labourer: 'ଶ୍ରମିକ',
    employee: 'କର୍ମଚାରୀ',
    overview_dashboard: 'ମୁଖ୍ୟ ଡ୍ୟାସବୋର୍ଡ',
  },
  as: {
    welcome: 'স্বাগতম',
    dashboard: "ডেশ্বব'ৰ্ড",
    supervisor_dashboard: 'চাইট চুপাৰভাইজাৰ হাব',
    employees: 'কৰ্মচাৰীসকল',
    labours: 'শ্ৰমিক ব্যৱস্থাপনা',
    hr_management: 'এইচ আৰ ব্যৱস্থাপনা',
    projects: 'প্ৰকল্প আৰু চাইটসমূহ',
    sites: 'নিৰ্মাণ ক্ষেত্ৰ',
    attendance: 'দৈনিক উপস্থিতি',
    tasks: 'কাৰ্য ব্যৱস্থাপনা',
    office_tasks: 'কাৰ্যালয়ৰ কাম',
    leaves: 'ছুটীৰ আবেদন',
    salary: 'দৰমহা আৰু গাণনিক',
    my_salary: 'মোৰ দৰমহা',
    materials: 'সামগ্ৰী আৰু অনুৰোধ',
    suppliers: 'যোগানকাৰী আৰু নিৰিখ',
    reports: 'কাৰ্যকৰী প্ৰতিবেদন',
    csv_hub: 'চিএছভি আমদানি / ৰপ্তানি',
    ai_insights: 'জেমিনি এআই বিশ্লেষণ',
    supabase_setup: 'ছুপাবেছ এছকিউএল ছেটআপ',
    sign_out: 'চাইন আউট',
    sync_supabase: 'ছুপাবেছ ছিংক কৰক',
    logged_in_account: 'লগ-ইন একাউণ্ট',
    used_material: 'ব্যৱহৃত সামগ্ৰীৰ তথ্য',
    photo_attendance: 'ফটো আৰু স্থান উপস্থিতি',
    present: 'উপস্থিত',
    absent: 'অনুপস্থিত',
    site_supervisor: 'চাইট চুপাৰভাইজাৰ',
    labourer: 'শ্ৰমিক',
    employee: 'কৰ্মচাৰী',
    overview_dashboard: "মূল ডেশ্বব'ৰ্ড",
  },
  ur: {
    welcome: 'خوش آمدید',
    dashboard: 'ڈیش بورڈ',
    supervisor_dashboard: 'سائٹ سپروائزر حب',
    employees: 'ملازمین',
    labours: 'مزدور مینجمنٹ',
    hr_management: 'ایچ آر مینجمنٹ',
    projects: 'پروجیکٹس اور سائٹس',
    sites: 'تعمیراتی سائٹس',
    attendance: 'روزانہ حاضری',
    tasks: 'ٹاسک مینجمنٹ',
    office_tasks: 'دفتری کام',
    leaves: 'چھٹی کی درخواستیں',
    salary: 'تنخواہ اور اکاؤنٹنٹ',
    my_salary: 'میری تنخواہ',
    materials: 'میٹریل اور درخواستیں',
    suppliers: 'سپلائرز اور کوٹیشنز',
    reports: 'آپریشنل رپورٹس',
    csv_hub: 'سی ایس وی امپورٹ / ایکسپورٹ',
    ai_insights: 'جیمنی اے آئی بصیرت',
    supabase_setup: 'سوپابیس ایس کیو ایل سیٹ اپ',
    sign_out: 'سائن آؤٹ',
    sync_supabase: 'سوپابیس سنک کریں',
    logged_in_account: 'لاگ ان اکاؤنٹ',
    used_material: 'استعمال شدہ میٹریل ڈیٹا',
    photo_attendance: 'تصویر اور لوکیشن حاضری',
    present: 'حاضر',
    absent: 'غیر حاضر',
    site_supervisor: 'سائٹ سپروائزر',
    labourer: 'مزدور',
    employee: 'ملازم',
    overview_dashboard: 'جائزہ ڈیش بورڈ',
  },
  sa: {
    welcome: 'स्वागतम्',
    dashboard: 'नियन्त्रणपटलम्',
    supervisor_dashboard: 'स्थान-पर्यवेक्षक-केन्द्रम्',
    employees: 'कर्मचारिणः',
    labours: 'श्रमिक-प्रबन्धनम्',
    hr_management: 'मानवसंसाधन-प्रबन्धनम्',
    projects: 'परियोजनाः स्थानानि च',
    sites: 'निर्माण-स्थानानि',
    attendance: 'दैनिक-उपस्थितिः',
    tasks: 'कार्य-प्रबन्धनम्',
    office_tasks: 'कार्यालय-कार्याणि',
    leaves: 'अवकाश-प्रार्थनाः',
    salary: 'वेतनं लेखापालश्च',
    my_salary: 'मम वेतनम्',
    materials: 'सामग्री-याचनाः',
    suppliers: 'आपूर्तिकर्तारः',
    reports: 'कार्य-प्रतिवेदनानि',
    csv_hub: 'सीएसवी आयात / निर्यात',
    ai_insights: 'जेमिनी एआई प्रज्ञा',
    supabase_setup: 'सुपाबेस एसक्यूएल विन्यासः',
    sign_out: 'निर्गमनम्',
    sync_supabase: 'सुपाबेस समन्वयः',
    logged_in_account: 'प्रविष्ट-लेखा',
    used_material: 'प्रयुक्त-सामग्री-विवरणम्',
    photo_attendance: 'चित्र-स्थान-उपस्थितिः',
    present: 'उपस्थितः',
    absent: 'अनुपस्थितः',
    site_supervisor: 'स्थान-पर्यवेक्षकः',
    labourer: 'श्रमिकः',
    employee: 'कर्मचारी',
    overview_dashboard: 'मुख्य-नियन्त्रणपटलम्',
  },
};

const REGIONAL_OVERRIDES: Record<string, Record<string, string>> = {
  kok: { welcome: 'येवकार', dashboard: 'डॅशबोर्ड', attendance: 'दिसाळी हजेरी', my_salary: 'म्हजो पगार', labours: 'कामगार वेवस्थापन', used_material: 'वापरिल्ले साहित्य', sign_out: 'भायर सर' },
  mai: { welcome: 'स्वागत अछि', dashboard: 'डैशबोर्ड', attendance: 'दैनिक हाजिरी', my_salary: 'हमर वेतन', labours: 'मजदूर प्रबंधन', used_material: 'प्रयुक्त सामग्री डेटा', sign_out: 'लॉग आउट' },
  doi: { welcome: 'जी आयां गी', dashboard: 'डैशबोर्ड', attendance: 'रोजाना हाजरी', my_salary: 'मेरी तनखाह', labours: 'मजदूर प्रबंधन', used_material: 'बरतेया मटीरियल डेटा', sign_out: 'लॉग आउट' },
  ks: { welcome: 'ख़ुश आमदीद', dashboard: 'डैशबोर्ड', attendance: 'दैनिक हाज़िरी', my_salary: 'म्योन तनख़ाह', labours: 'मज़दूर प्रबंधन', used_material: 'इस्तेमाल शुदा मटीरियल', sign_out: 'लॉग आउट' },
  mni: { welcome: 'তরাম্না ওকচরি', dashboard: 'ডেশবোর্ড', attendance: 'নোংমগী এতেন্দেন্স', my_salary: 'ঐগী তলব', labours: 'শিন্মী মেনেজমেন্ত', used_material: 'শিজিন্নখ্রবা পোৎলম', sign_out: 'সাইন্ আউট' },
  ne: { welcome: 'स्वागत छ', dashboard: 'ड्यासबोर्ड', attendance: 'दैनिक हाजिरी', my_salary: 'मेरो तलब', labours: 'श्रमिक व्यवस्थापन', used_material: 'प्रयोग गरिएको सामग्री', sign_out: 'साइन आउट' },
  brx: { welcome: 'बरायबाय', dashboard: 'डैशबोर्ड', attendance: 'सानफ्रोमबो बाहागो लानाय', my_salary: 'आंनि बेथन', labours: 'मावथि सामलायनाय', used_material: 'बाहायनाय मुवा', sign_out: 'लग आउट' },
  sat: { welcome: 'सगुन दाराम', dashboard: 'डैशबोर्ड', attendance: 'दिनाम हाजिरी', my_salary: 'इञाग कुड़ाय', labours: 'कामीया व्यवस्था', used_material: 'प्रयुक्त सामग्री', sign_out: 'लॉग आउट' },
  sd: { welcome: 'भले करे आया', dashboard: 'डैशबोर्ड', attendance: 'रोज़ानी हाज़िरी', my_salary: 'मुंहिंजी पघार', labours: 'मज़दूर इंतज़ाम', used_material: 'इस्तेमाल थियल सामान', sign_out: 'साइन आउट' },
};

export function getUiDictionaryForLanguage(langCode: string): Record<string, string> {
  const code = (langCode || 'en').trim().toLowerCase();
  if (CORE_UI_DICTIONARY[code]) {
    return CORE_UI_DICTIONARY[code];
  }
  const base = { ...(CORE_UI_DICTIONARY.hi || CORE_UI_DICTIONARY.en) };
  if (REGIONAL_OVERRIDES[code]) {
    Object.assign(base, REGIONAL_OVERRIDES[code]);
  }
  return base;
}

/**
 * Comprehensive English -> Devanagari / Indic Phrase & Word Dictionary covering all modules
 * (Dashboard, Site Supervisor Hub, Employees, Labour Management, HR Management, Projects & Sites,
 * Construction Sites, Daily Attendance, Task Management, Leave Requests, Salary/Payroll,
 * Materials & Suppliers, Reports, CSV Import/Export, Login, and AI Assistant).
 */
const DEVANAGARI_PHRASE_MAP: Array<[string, string]> = [
  ['Construction Workforce & Site Operations', 'निर्माण कार्यबल और साइट संचालन'],
  ['Construction Workforce & Site Overview', 'निर्माण कार्यबल और साइट अवलोकन'],
  ['Select Your Operational Role to Sign In', 'साइन इन करने के लिए अपनी परिचालन भूमिका चुनें'],
  ['Choose your operational role below to access your authorized BuildMate workspace.', 'अपने अधिकृत बिल्डमेट कार्यक्षेत्र तक पहुंचने के लिए नीचे अपनी भूमिका चुनें।'],
  ['Single Active Role Enforced', 'एकल सक्रिय भूमिका लागू'],
  ['Sign in to BuildMate', 'बिल्डमेट में साइन इन करें'],
  ['Enter your registered work email or User ID and password to access your dashboard.', 'अपने डैशबोर्ड तक पहुंचने के लिए अपना पंजीकृत कार्य ईमेल या यूज़र आईडी और पासवर्ड दर्ज करें।'],
  ['Work Email Address or User ID', 'कार्य ईमेल पता या यूज़र आईडी'],
  ['Enter your account password', 'अपना खाता पासवर्ड दर्ज करें'],
  ['Remember me on this device', 'इस डिवाइस पर मुझे याद रखें'],
  ['Forgot password?', 'पासवर्ड भूल गए?'],
  ['Sign In', 'साइन इन करें'],
  ['Sign Out', 'लॉग आउट'],
  ['Logged In Account', 'लॉग-इन खाता'],
  ['LOGGED IN ACCOUNT', 'लॉग-इन खाता'],
  ['Overview Dashboard', 'अवलोकन डैशबोर्ड'],
  ['Open My Office Tasks', 'मेरे कार्यालय कार्य खोलें'],
  ['Open My Assigned Tasks', 'मेरे निर्धारित कार्य खोलें'],
  ['Site Supervisor Hub', 'साइट सुपरवाइज़र हब'],
  ['SITE SUPERVISOR HUB', 'साइट सुपरवाइज़र हब'],
  ['ACTIVE SITE SUPERVISOR', 'सक्रिय साइट सुपरवाइज़र'],
  ['IN SUPABASE', 'सुपाबेस में'],
  ['ROLL-CALL DATE', 'हाजिरी तिथि'],
  ['Assigned Site Crew', 'नियुक्त साइट दल'],
  ['Active Site Tasks', 'सक्रिय साइट कार्य'],
  ['Used Material Entries', 'प्रयुक्त सामग्री प्रविष्टियां'],
  ['Labour Photo Bucket', 'श्रमिक फोटो बकेट'],
  ['Click Photo with Location for Labour Attendance', 'श्रमिक उपस्थिति के लिए लोकेशन के साथ फोटो खींचें'],
  ['Add Used Material Data on Site (Site Supervisor)', 'साइट पर प्रयुक्त सामग्री डेटा जोड़ें (साइट सुपरवाइज़र)'],
  ['Add Used Material Data (Site Supervisor)', 'प्रयुक्त सामग्री डेटा जोड़ें (साइट सुपरवाइज़र)'],
  ['SITE SUPERVISOR MATERIAL CONSUMPTION', 'साइट सुपरवाइज़र सामग्री खपत'],
  ['Select Site Labourer', 'साइट श्रमिक चुनें'],
  ['Select Material Used', 'प्रयुक्त सामग्री चुनें'],
  ['Site Task / Work Package', 'साइट कार्य / वर्क पैकेज'],
  ['Click Labour Photo with GPS', 'जीपीएस के साथ श्रमिक फोटो खींचें'],
  ['Upload Image File', 'फोटो फ़ाइल अपलोड करें'],
  ['Record Used Material Data', 'प्रयुक्त सामग्री डेटा दर्ज करें'],
  ['Save Used Material Data', 'प्रयुक्त सामग्री डेटा सहेजें'],
  ['Recent Used Material Logs on', 'हाल ही में प्रयुक्त सामग्री लॉग —'],
  ['Available Stock', 'उपलब्ध स्टॉक'],
  ['Remaining After Entry', 'प्रविष्टि के बाद शेष'],
  ['Shift Hours', 'शिफ्ट घंटे'],
  ['Overtime', 'ओवरटाइम'],
  ['GPS Latitude', 'जीपीएस अक्षांश'],
  ['GPS Longitude', 'जीपीएस देशांतर'],
  ['Sync Site GPS', 'साइट जीपीएस सिंक करें'],
  ['Usage Date', 'उपयोग तिथि'],
  ['Quantity Used', 'प्रयुक्त मात्रा'],
  ['Daily Attendance', 'दैनिक उपस्थिति'],
  ['My Daily Attendance', 'मेरी दैनिक उपस्थिति'],
  ['Mark My Attendance with Selfie & Site Geofence Verification', 'सेल्फी और साइट जियोफेंस सत्यापन के साथ मेरी उपस्थिति दर्ज करें'],
  ['Live Selfie Photo', 'लाइव सेल्फी फोटो'],
  ['Saves in Supabase Bucket', 'सुपाबेस बकेट में सहेजा जाता है'],
  ['Total Workforce Roster', 'कुल कार्यबल सूची'],
  ["Today's Site Attendance", 'आज की साइट उपस्थिति'],
  ['Active Projects & Sites', 'सक्रिय परियोजनाएं और साइटें'],
  ['Monthly Payroll & Approvals', 'मासिक वेतन और स्वीकृतियां'],
  ['Log Daily Attendance', 'दैनिक उपस्थिति दर्ज करें'],
  ['Register Worker', 'श्रमिक पंजीकृत करें'],
  ['Assign to Site', 'साइट पर नियुक्त करें'],
  ['AI Workforce Analysis', 'एआई कार्यबल विश्लेषण'],
  ['Construction Site Staffing & Execution Progress', 'निर्माण स्थल स्टाफिंग और निष्पादन प्रगति'],
  ['Manage Projects & Sites', 'परियोजनाएं और साइटें प्रबंधित करें'],
  ['Site Material Requests', 'साइट सामग्री अनुरोध'],
  ['Construction Materials, Requisitions & Suppliers', 'निर्माण सामग्री, आवश्यकताएं और आपूर्तिकर्ता'],
  ['Site Requisitions', 'साइट आवश्यकताएं'],
  ['Suppliers & Quotes', 'आपूर्तिकर्ता और कोटेशन'],
  ['Site Material Usage', 'साइट सामग्री उपयोग'],
  ['Ask Gemini AI', 'जेमिनी एआई से पूछें'],
  ['Online (Supabase Live)', 'ऑनलाइन (सुपाबेस लाइव)'],
  ['Supabase Connected DB', 'सुपाबेस कनेक्टेड डेटाबेस'],
  ['Supabase Connected', 'सुपाबेस कनेक्टेड'],
  ['Sync Live Supabase DB', 'लाइव सुपाबेस सिंक करें'],
  ['Install App', 'ऐप इंस्टॉल करें'],
  ['Dark Mode', 'डार्क मोड'],
  ['Light Mode', 'लाइट मोड'],
];

const DEVANAGARI_WORD_MAP: Record<string, string> = {
  welcome: 'स्वागत है',
  admin: 'एडमिन',
  dashboard: 'डैशबोर्ड',
  site: 'साइट',
  sites: 'साइटें',
  supervisor: 'सुपरवाइज़र',
  supervisors: 'सुपरवाइज़र',
  hub: 'हब',
  employee: 'कर्मचारी',
  employees: 'कर्मचारी',
  labour: 'श्रमिक',
  labourer: 'श्रमिक',
  labourers: 'श्रमिक',
  management: 'प्रबंधन',
  hr: 'एचआर',
  project: 'परियोजना',
  projects: 'परियोजनाएं',
  construction: 'निर्माण',
  daily: 'दैनिक',
  attendance: 'उपस्थिति',
  task: 'कार्य',
  tasks: 'कार्य',
  office: 'कार्यालय',
  leave: 'अवकाश',
  leaves: 'अवकाश',
  request: 'अनुरोध',
  requests: 'अनुरोध',
  payroll: 'वेतन',
  accountant: 'लेखाकार',
  salary: 'वेतन',
  my: 'मेरा',
  material: 'सामग्री',
  materials: 'सामग्री',
  supplier: 'आपूर्तिकर्ता',
  suppliers: 'आपूर्तिकर्ता',
  quotes: 'कोटेशन',
  quotation: 'कोटेशन',
  quotations: 'कोटेशन',
  operational: 'परिचालन',
  report: 'रिपोर्ट',
  reports: 'रिपोर्ट',
  import: 'आयात',
  export: 'निर्यात',
  active: 'सक्रिय',
  inactive: 'निष्क्रिय',
  online: 'ऑनलाइन',
  offline: 'ऑफ़लाइन',
  live: 'लाइव',
  database: 'डेटाबेस',
  table: 'तालिका',
  account: 'खाता',
  id: 'आईडी',
  work: 'कार्य',
  email: 'ईमेल',
  phone: 'फ़ोन',
  password: 'पासवर्ड',
  status: 'स्थिति',
  present: 'उपस्थित',
  absent: 'अनुपस्थित',
  completed: 'पूर्ण',
  delayed: 'विलंबित',
  pending: 'लंबित',
  approved: 'स्वीकृत',
  rejected: 'अस्वीकृत',
  paid: 'भुगतान किया',
  unpaid: 'अदत्त',
  hours: 'घंटे',
  worked: 'काम किया',
  shift: 'शिफ्ट',
  overtime: 'ओवरटाइम',
  date: 'तिथि',
  location: 'स्थान',
  address: 'पता',
  photo: 'फोटो',
  selfie: 'सेल्फी',
  bucket: 'बकेट',
  storage: 'स्टोरेज',
  geofence: 'जियोफेंस',
  verified: 'सत्यापित',
  gps: 'जीपीएस',
  latitude: 'अक्षांश',
  longitude: 'देशांतर',
  used: 'प्रयुक्त',
  data: 'डेटा',
  entries: 'प्रविष्टियां',
  entry: 'प्रविष्टि',
  logged: 'दर्ज',
  by: 'द्वारा',
  on: 'पर',
  in: 'में',
  to: 'को',
  for: 'के लिए',
  with: 'के साथ',
  and: 'और',
  or: 'या',
  of: 'का',
  from: 'से',
  select: 'चुनें',
  save: 'सहेजें',
  saved: 'सहेजा गया',
  add: 'जोड़ें',
  record: 'दर्ज करें',
  update: 'अपडेट करें',
  delete: 'हटाएं',
  cancel: 'रद्द करें',
  submit: 'जमा करें',
  upload: 'अपलोड करें',
  click: 'खींचें',
  capture: 'कैप्चर करें',
  search: 'खोजें',
  filter: 'फ़िल्टर',
  all: 'सभी',
  total: 'कुल',
  monthly: 'मासिक',
  weekly: 'साप्ताहिक',
  view: 'दृश्य',
  name: 'नाम',
  role: 'भूमिका',
  skill: 'कौशल',
  designation: 'पदनाम',
  wage: 'मजदूरी',
  rate: 'दर',
  basic: 'मूल',
  bonus: 'बोनस',
  deductions: 'कटौती',
  net: 'शुद्ध',
  cost: 'लागत',
  unit: 'इकाई',
  units: 'इकाइयां',
  bags: 'बैग',
  quantity: 'मात्रा',
  stock: 'स्टॉक',
  available: 'उपलब्ध',
  remaining: 'शेष',
  after: 'बाद',
  value: 'मूल्य',
  inr: 'रु.',
  engineer: 'इंजीनियर',
  engineers: 'इंजीनियर',
  crew: 'दल',
  assigned: 'नियुक्त',
  specialization: 'विशेषज्ञता',
  commercial: 'वाणिज्यिक',
  towers: 'टावर्स',
  tower: 'टावर',
  phase: 'चरण',
  plot: 'प्लॉट',
  main: 'मेन',
  road: 'रोड',
  bengaluru: 'बेंगलुरु',
  whitefield: 'व्हाइटफील्ड',
  mumbai: 'मुंबई',
  pune: 'पुणे',
  delhi: 'दिल्ली',
  hyderabad: 'हैदराबाद',
  chennai: 'चेन्नई',
  kolkata: 'कोलकाता',
  light: 'लाइट',
  dark: 'डार्क',
  mode: 'मोड',
  queue: 'कतार',
  queued: 'कतारबद्ध',
  sync: 'सिंक',
  syncing: 'सिंक हो रहा है',
  worker: 'श्रमिक',
  workers: 'श्रमिक',
  skilled: 'कुशल',
  salaried: 'वेतनभोगी',
  inventory: 'इन्वेंट्री',
  requisition: 'मांगपत्र',
  requisitions: 'मांगपत्र',
  expenditure: 'व्यय',
  consumption: 'खपत',
  automatically: 'स्वचालित रूप से',
  deducts: 'घटाता है',
  updates: 'अपडेट करता है',
  captures: 'कैप्चर करता है',
  coordinates: 'निर्देशांक',
  saves: 'सहेजता है',
  directly: 'सीधे',
  recent: 'हाल के',
  logs: 'लॉग',
  log: 'लॉग',
  package: 'पैकेज',
  master: 'मास्टर',
  mason: 'राजमिस्त्री',
  plastering: 'प्लास्टरिंग',
  carpenter: 'बढ़ई',
  shuttering: 'शटरिंग',
  bar: 'सरिया',
  bender: 'बेंडर',
  steel: 'स्टील',
  fixer: 'फिक्सर',
  electrician: 'इलेक्ट्रीशियन',
  plumber: 'प्लंबर',
  welder: 'वेल्डर',
  cement: 'सीमेंट',
  grade: 'ग्रेड',
  bulk: 'बल्क',
  core: 'कोर',
  wall: 'दीवार',
  blockwork: 'ब्लॉकवर्क',
  formwork: 'फॉर्मवर्क',
  floor: 'मंजिल',
  slab: 'स्लैब',
  arjun: 'अर्जुन',
  deshmukh: 'देशमुख',
  sachin: 'सचिन',
  patil: 'पाटिल',
  imran: 'इमरान',
  shaikh: 'शेख',
  akshay: 'अक्षय',
  jadhav: 'जाधव',
  deepak: 'दीपक',
  yadav: 'यादव',
  pravin: 'प्रवीण',
  shinde: 'शिंदे',
  kumar: 'कुमार',
  nitin: 'नितिन',
  more: 'मोरे',
  sameer: 'समीर',
  khan: 'खान',
  manoj: 'मनोज',
  pawar: 'पवार',
  sunil: 'सुनील',
  verma: 'वर्मा',
  manasi: 'मानसी',
  faijan: 'फैजान',
  priya: 'प्रिया',
  rahul: 'राहुल',
  neel: 'नील',
  shah: 'शाह',
  priyanka: 'प्रियंका',
  joshi: 'जोशी',
  rohit: 'रोहित',
  kulkarni: 'कुलकर्णी',
  aarti: 'आरती',
  varun: 'वरुण',
  mehta: 'मेहता',
  sharma: 'शर्मा',
  rohan: 'रोहन',
  anjali: 'अंजलि',
  vivek: 'विवेक',
  neha: 'नेहा',
  aditya: 'आदित्य',
  sneha: 'स्नेहा',
  kunal: 'कुणाल',
  meera: 'मीरा',
  nair: 'नायर',
  akash: 'आकाश',
  pooja: 'पूजा',
  singh: 'सिंह',
  siddharth: 'सिद्धार्थ',
  rao: 'राव',
  ramesh: 'रमेश',
  salim: 'सलीम',
  ganesh: 'गणेश',
  sunita: 'सुनीता',
  prakash: 'प्रकाश',
  laxman: 'लक्ष्मण',
  shankar: 'शंकर',
  chavan: 'चव्हाण',
  rekha: 'रेखा',
  kumari: 'कुमारी',
  balaji: 'बालाजी',
  arif: 'आरिफ',
  vijay: 'विजय',
  kale: 'काले',
  anita: 'अनीता',
  gaikwad: 'गायकवाड़',
  raju: 'राजू',
  bhosale: 'भोसले',
  santosh: 'संतोष',
  mane: 'माने',
  kavita: 'कविता',
  sawant: 'सावंत',
  mahesh: 'महेश',
  divya: 'दिव्या',
  menon: 'मेनन',
  harsh: 'हर्ष',
  swati: 'स्वाति',
  nikhil: 'निखिल',
  gaurav: 'गौरव',
  shreya: 'श्रेया',
  tushar: 'तुषार',
  tanvi: 'तन्वी',
  prasad: 'प्रसाद',
  rameshwar: 'रामेश्वर',
  mohammed: 'मोहम्मद',
  irfan: 'इरफान',
  balwinder: 'बलविंदर',
  suresh: 'सुरेश',
  munda: 'मुंडा',
  lakshmi: 'लक्ष्मी',
  narayanan: 'नारायणन',
  buildmate: 'बिल्डमेट',
  supabase: 'सुपाबेस',
  gemini: 'जेमिनी',
  ai: 'एआई',
  nlp: 'एनएलपी',
  python: 'पायथन',
  public: 'पब्लिक',
  image: 'इमेज',
  images: 'इमेजेस',
  attendence: 'उपस्थिति',
  attendace: 'उपस्थिति',
  quantities: 'मात्राएं',
  kg: 'किग्रा',
  fit: 'फिट',
  duty: 'ड्यूटी',
  directory: 'निर्देशिका',
  workforce: 'कार्यबल',
  register: 'पंजीकृत करें',
  connected: 'कनेक्टेड',
  includes: 'शामिल है',
  medical: 'मेडिकल',
  fitness: 'फिटनेस',
  kyc: 'केवाईसी',
  verification: 'सत्यापन',
  actions: 'कार्रवाई',
  contact: 'संपर्क',
  statuses: 'स्थितियां',
  skyline: 'स्काईलाइन',
  high: 'हाई',
  rise: 'राइज़',
  structural: 'स्ट्रक्चरल',
  rcc: 'आरसीसी',
  opc: 'ओपीसी',
  ultratech: 'अल्ट्राटेक',
  deccan: 'डेक्कन',
  infrastructure: 'इंफ्रास्ट्रक्चर',
  geolocation: 'जियोलोकेशन',
  current: 'वर्तमान',
  are: 'हैं',
  center: 'केंद्र',
  within: 'के भीतर',
  boundary: 'सीमा',
  authenticated: 'प्रमाणित',
  via: 'द्वारा',
  admins: 'एडमिन्स',
};

/**
 * Unicode Block Offset Mapping from Devanagari (U+0900..U+097F) to other Brahmic scripts
 * so any Devanagari word or phonetic transliteration automatically converts to
 * Bengali/Assamese, Gujarati, Gurmukhi, Odia, Tamil, Telugu, Kannada, or Malayalam script!
 */
const SCRIPT_UNICODE_OFFSET: Record<string, number> = {
  bn: 0x0980 - 0x0900, // Bengali
  as: 0x0980 - 0x0900, // Assamese
  mni: 0x0980 - 0x0900, // Manipuri (Bengali/Meitei script)
  pa: 0x0a00 - 0x0900, // Gurmukhi (Punjabi)
  gu: 0x0a80 - 0x0900, // Gujarati
  or: 0x0b00 - 0x0900, // Odia
  ta: 0x0b80 - 0x0900, // Tamil
  te: 0x0c00 - 0x0900, // Telugu
  kn: 0x0c80 - 0x0900, // Kannada
  ml: 0x0d00 - 0x0900, // Malayalam
};

/**
 * Converts a Devanagari string to another Indian Brahmic script using Unicode block offsets
 * while cleaning unsupported code points in scripts like Tamil.
 */
function convertDevanagariToRegionalScript(devanagariText: string, langCode: string): string {
  if (langCode === 'ur') {
    return transliterateDevanagariToUrdu(devanagariText);
  }
  const offset = SCRIPT_UNICODE_OFFSET[langCode];
  if (!offset) {
    return devanagariText;
  }
  let out = '';
  for (let i = 0; i < devanagariText.length; i++) {
    const code = devanagariText.charCodeAt(i);
    if (code === 0x0901 || code === 0x0902) {
      // Chandrabindu / Anusvara
      if (langCode === 'ta') {
        out += 'ம்';
      } else {
        out += String.fromCharCode(0x0902 + offset);
      }
    } else if (code >= 0x0905 && code <= 0x0939) {
      let mapped = code + offset;
      // Tamil script normalizations for voiced/aspirated stops
      if (langCode === 'ta') {
        const devOffset = code - 0x0900;
        if (devOffset === 0x0b) mapped = 0x0b95; // Vocalic R -> ka
        else if (devOffset === 0x0d) mapped = 0x0b8e; // Candra E -> E
        else if (devOffset === 0x11) mapped = 0x0b92; // Candra O -> O
        else if (devOffset >= 0x16 && devOffset <= 0x18) mapped = 0x0b95; // kha, ga, gha -> ka
        else if (devOffset >= 0x1b && devOffset <= 0x1d) mapped = 0x0b9a; // cha, ja, jha -> ca
        else if (devOffset >= 0x20 && devOffset <= 0x22) mapped = 0x0b9f; // tha, da, dha -> tta
        else if (devOffset >= 0x25 && devOffset <= 0x27) mapped = 0x0ba4; // tha, da, dha -> ta
        else if (devOffset >= 0x2b && devOffset <= 0x2d) mapped = 0x0baa; // pha, ba, bha -> pa
        else if (devOffset === 0x36 || devOffset === 0x37) mapped = 0x0bb8; // sha, ssa -> sa
      }
      out += String.fromCharCode(mapped);
    } else if (code >= 0x093e && code <= 0x094d) {
      // Vowel signs and virama
      const devOffset = code - 0x0900;
      if (devOffset === 0x43 || devOffset === 0x44) {
        // Vocalic R sign -> 'रि' equivalent in Tamil
        out += langCode === 'ta' ? 'ரி' : String.fromCharCode(code + offset);
      } else if (devOffset === 0x45) {
        out += String.fromCharCode(0x0947 + offset);
      } else if (devOffset === 0x49) {
        out += String.fromCharCode(0x094b + offset);
      } else {
        out += String.fromCharCode(code + offset);
      }
    } else if (code === 0x093c) {
      // Nukta - skip in non-Devanagari scripts
      continue;
    } else {
      out += devanagariText[i];
    }
  }
  return out;
}

function transliterateDevanagariToUrdu(text: string): string {
  const map: Record<string, string> = {
    अ: 'ا', आ: 'آ', इ: 'اِ', ई: 'ای', उ: 'اُ', ऊ: 'او', ए: 'اے', ऐ: 'اے', ओ: 'او', औ: 'او',
    क: 'ک', ख: 'کھ', ग: 'گ', घ: 'گھ', च: 'چ', छ: 'چھ', ज: 'ج', झ: 'جھ',
    ट: 'ٹ', ठ: 'ٹھ', ड: 'ڈ', ढ: 'ڈھ', ण: 'ن', त: 'ت', थ: 'تھ', द: 'د', ध: 'دھ', न: 'ن',
    प: 'پ', फ: 'ف', ब: 'ب', भ: 'بھ', म: 'م', य: 'ی', र: 'ر', ल: 'ل', व: 'و',
    श: 'ش', ष: 'ش', स: 'س', ह: 'ہ', ड़: 'ڑ', ढ़: 'ڑھ',
    'ा': 'ا', 'ि': 'ِ', 'ी': 'ی', 'ु': 'ُ', 'ू': 'و', 'े': 'ے', 'ै': 'ے', 'ो': 'و', 'ौ': 'و',
    'ं': 'ں', 'ँ': 'ں', '्': '', '़': '',
  };
  let out = '';
  for (const ch of text) {
    out += map[ch] !== undefined ? map[ch] : ch;
  }
  return out;
}

/**
 * Phonetic Latin/English -> Devanagari transliterator for any unmapped word or proper noun
 */
function phoneticEnglishWordToDevanagari(word: string): string {
  const lower = word.toLowerCase();
  if (DEVANAGARI_WORD_MAP[lower]) {
    return DEVANAGARI_WORD_MAP[lower];
  }

  // Common suffixes & digraphs
  let s = lower
    .replace(/tion$/g, 'शन')
    .replace(/sion$/g, 'जन')
    .replace(/ment$/g, 'मेंट')
    .replace(/ness$/g, 'नेस')
    .replace(/ing$/g, 'इंग')
    .replace(/er$/g, 'र')
    .replace(/or$/g, 'र')
    .replace(/sh/g, 'श')
    .replace(/ch/g, 'च')
    .replace(/th/g, 'थ')
    .replace(/ph/g, 'फ')
    .replace(/gh/g, 'घ')
    .replace(/kh/g, 'ख')
    .replace(/bh/g, 'भ')
    .replace(/dh/g, 'ध')
    .replace(/ck/g, 'क')
    .replace(/qu/g, 'क्व')
    .replace(/ee/g, 'ी')
    .replace(/oo/g, 'ू')
    .replace(/ai/g, 'ै')
    .replace(/au/g, 'ौ')
    .replace(/ou/g, 'ाउ')
    .replace(/ea/g, 'ी');

  const charMap: Record<string, string> = {
    a: 'अ',
    b: 'ब',
    c: 'क',
    d: 'द',
    e: 'ए',
    f: 'फ',
    g: 'ग',
    h: 'ह',
    i: 'इ',
    j: 'ज',
    k: 'क',
    l: 'ल',
    m: 'म',
    n: 'न',
    o: 'ओ',
    p: 'प',
    q: 'क',
    r: 'र',
    s: 'स',
    t: 'ट',
    u: 'उ',
    v: 'व',
    w: 'व',
    x: 'क्स',
    y: 'य',
    z: 'ज़',
  };

  const vowelMatra: Record<string, string> = {
    a: 'ा',
    e: 'े',
    i: 'ि',
    o: 'ो',
    u: 'ु',
  };

  let res = '';
  let prevWasConsonant = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch.charCodeAt(0) >= 0x0900) {
      res += ch;
      prevWasConsonant = false;
      continue;
    }
    if (vowelMatra[ch]) {
      if (i === 0 || !prevWasConsonant) {
        res += charMap[ch] || ch;
      } else {
        // After a consonant, 'a' is inherent in Devanagari unless 'aa'
        if (ch !== 'a' || s[i + 1] === 'a') {
          res += vowelMatra[ch];
        }
      }
      prevWasConsonant = false;
    } else if (charMap[ch]) {
      res += charMap[ch];
      prevWasConsonant = true;
    } else {
      res += ch;
      prevWasConsonant = false;
    }
  }

  return res;
}

const translationCache = new Map<string, string>();

/**
 * Translates any arbitrary UI text string into the selected Indian language with zero English remaining.
 */
export function translateFullUiText(text: string, langCode: string): string {
  const code = (langCode || 'en').trim().toLowerCase();
  if (code === 'en' || !text || !/[A-Za-z]/.test(text)) {
    return text;
  }

  // Exact email address match: return immediately in original English without alteration
  const trimmed = text.trim();
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
    return text;
  }

  const cacheKey = `${code}::${text}`;
  const cached = translationCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Protect email addresses with Private Use Area symbols so Latin regexes never touch them
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails: string[] = [];
  let result = text.replace(emailRegex, (match) => {
    const token = `\uE000${emails.length}\uE001`;
    emails.push(match);
    return token;
  });

  const uiDict = getUiDictionaryForLanguage(code);

  // 1. Direct exact match against core UI dictionary values
  for (const [enKey, enVal] of Object.entries(CORE_UI_DICTIONARY.en)) {
    if (trimmed.toLowerCase() === enVal.toLowerCase() && uiDict[enKey]) {
      let exactOut = text.replace(trimmed, uiDict[enKey]);
      if (emails.length > 0) {
        exactOut = exactOut.replace(/\uE000(\d+)\uE001/g, (_, idxStr) => emails[Number(idxStr)] ?? _);
      }
      translationCache.set(cacheKey, exactOut);
      return exactOut;
    }
  }

  // 2. Replace core dictionary phrases first
  const corePhrasePairs: Array<[string, string]> = Object.entries(CORE_UI_DICTIONARY.en)
    .map(([k, enPhrase]): [string, string] => [enPhrase, uiDict[k] || enPhrase])
    .sort((a, b) => b[0].length - a[0].length);

  for (const [enPhrase, targetPhrase] of corePhrasePairs) {
    if (enPhrase.length >= 4) {
      const escaped = enPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'gi'), targetPhrase);
    }
  }

  // 3. Replace extended construction ERP phrases (in Devanagari, then convert to target regional script if needed)
  for (const [enPhrase, devPhrase] of DEVANAGARI_PHRASE_MAP) {
    const escaped = enPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    if (regex.test(result)) {
      const regionalPhrase = convertDevanagariToRegionalScript(devPhrase, code);
      result = result.replace(regex, regionalPhrase);
    }
  }

  // 4. Replace all remaining Latin words (including words next to underscores or digits like site_supervisors, task_materials, 50kg, 250m)
  result = result.replace(/([A-Za-z]{2,})/g, (match) => {
    const lower = match.toLowerCase();
    const devWord = DEVANAGARI_WORD_MAP[lower] || phoneticEnglishWordToDevanagari(match);
    return convertDevanagariToRegionalScript(devWord, code);
  });

  // 5. Replace any remaining single Latin letters (like "Tower A", "0m", "N", "E")
  result = result.replace(/([A-Za-z])/g, (match) => {
    const devChar = phoneticEnglishWordToDevanagari(match);
    return convertDevanagariToRegionalScript(devChar, code);
  });

  // Restore protected email addresses in original English Latin characters
  if (emails.length > 0) {
    result = result.replace(/\uE000(\d+)\uE001/g, (_, idxStr) => emails[Number(idxStr)] ?? _);
  }

  translationCache.set(cacheKey, result);
  return result;
}
