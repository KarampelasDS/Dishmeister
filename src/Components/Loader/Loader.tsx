import React from "react";

interface LoaderProps {
  fullPage?: boolean;
}

const Loader: React.FC<LoaderProps> = ({ fullPage = false }) => {
  return (
    <div className={fullPage ? "loader-container loader-full-page" : "loader-container"}>
      <span className="spinner"></span>
    </div>
  );
};

export default Loader;
