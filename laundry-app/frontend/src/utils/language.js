export const translations = {
  en: {
    // Navigation
    home: "Home",
    services: "Services",
    orders: "Orders",
    wallet: "Wallet",
    profile: "Profile",
    
    // Auth
    login: "Sign In",
    register: "Register",
    logout: "Logout",
    
    // Services
    bookNow: "Book Now",
    addToCart: "Add to Cart",
    
    // Common
    loading: "Loading...",
    success: "Success!",
    error: "Error!",
    confirm: "Confirm",
    cancel: "Cancel"
  },
  ta: {
    // Navigation
    home: "முகப்பு",
    services: "சேவைகள்",
    orders: "ஆர்டர்கள்", 
    wallet: "பணப்பை",
    profile: "சுயவிவரம்",
    
    // Auth
    login: "உள்நுழைக",
    register: "பதிவு செய்க",
    logout: "வெளியேறுக",
    
    // Services
    bookNow: "முன்பதிவு செய்க",
    addToCart: "கார்ட்டில் சேர்க்க",
    
    // Common
    loading: "லோடிங்...",
    success: "வெற்றி!",
    error: "பிழை!",
    confirm: "உறுதி செய்க",
    cancel: "ரத்து செய்க"
  },
  hi: {
    // Navigation
    home: "होम",
    services: "सेवाएं",
    orders: "आर्डर्स",
    wallet: "वॉलेट",
    profile: "प्रोफाइल",
    
    // Auth
    login: "साइन इन",
    register: "रजिस्टर",
    logout: "लॉगआउट",
    
    // Services
    bookNow: "बुक करें",
    addToCart: "कार्ट में जोड़ें",
    
    // Common
    loading: "लोड हो रहा है...",
    success: "सफलता!",
    error: "त्रुटि!",
    confirm: "पुष्टि करें",
    cancel: "रद्द करें"
  }
};

export const LanguageContext = React.createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};