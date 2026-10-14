import { useEffect, useState } from "react";

import AppRoutes from "./routes/AppRoutes.jsx";

import LoadingScreen from "./components/common/LoadingScreen.jsx";

export default function App() {
  const [loading, setLoading] = useState(true);

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let currentProgress = 0;

    const progressInterval = setInterval(() => {
      /*
          Faster at the beginning,
          slightly slower near 100%.
        */

      let increase = 1;

      if (currentProgress < 40) {
        increase = 4;
      } else if (currentProgress < 75) {
        increase = 3;
      } else if (currentProgress < 95) {
        increase = 2;
      }

      currentProgress = Math.min(currentProgress + increase, 100);

      setProgress(currentProgress);

      if (currentProgress >= 100) {
        clearInterval(progressInterval);

        /*
            Keep 100% visible briefly
            before entering the app.
          */

        setTimeout(() => {
          setLoading(false);
        }, 450);
      }
    }, 55);

    return () => {
      clearInterval(progressInterval);
    };
  }, []);

  if (loading) {
    return <LoadingScreen progress={progress} />;
  }

  return <AppRoutes />;
}
