
import { useState, useEffect } from 'react';

export function useIsWebBrowser() {
  const [isWebBrowser, setIsWebBrowser] = useState(false);

  useEffect(() => {
    // Check if it's a web browser (not mobile app)
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileApp = /nadex|app/.test(userAgent) || 
                       window.location.href.includes('capacitor://');
    
    // For testing purposes, always consider it a web browser unless it's explicitly a mobile app
    const isWeb = !isMobileApp;
    
    console.log('useIsWebBrowser - userAgent:', userAgent);
    console.log('useIsWebBrowser - isMobileApp:', isMobileApp);
    console.log('useIsWebBrowser - isWeb:', isWeb);
    
    setIsWebBrowser(isWeb);
  }, []);

  return isWebBrowser;
}
