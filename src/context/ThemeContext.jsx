import React, { createContext, useEffect, useState } from "react";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("light");

  // Load saved theme (Force light)
  useEffect(() => {
    setTheme("light");
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  }, []);

  // Change theme dynamically (Keep light)
  const toggleTheme = () => {
    setTheme("light");
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
