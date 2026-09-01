import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center animate-pop-in">
        <div className="text-[120px] font-bold leading-none text-gradient mb-2">404</div>
        <p className="mb-6 text-lg text-muted-foreground">This page wandered off the grid.</p>
        <Link to="/" className="btn-primary">Back home</Link>
      </div>
    </div>
  );
};

export default NotFound;
