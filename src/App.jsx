// Components
import NavbarComponent from "./components/Navbar";
import MultiSendSection from "./components/MultiSendSection";
import Footer from "./components/Footer";
// Css
import "./App.css";

function App() {
  return (
    <div className="p-0 sm:p-0 md:p-6 lg:p-10 xl:p-10">
      <NavbarComponent />
      <MultiSendSection />
      <Footer />
    </div>
  );
}

export default App;
