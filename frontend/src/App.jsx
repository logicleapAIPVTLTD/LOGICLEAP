import { useState ,useEffect} from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import LogicLeapWireframe from './LogicLeapWireframe'

function App() {
  console.log(import.meta.env.VITE_API_URL);
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem("boqItems");
      sessionStorage.clear(); // clears WBS + BOM safely
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <>
      <LogicLeapWireframe />
    </>
  )
}

export default App
