import { useEffect, useState } from 'react';
import Header from './components/Header';
import Features from './components/Features';
import About from './components/About';
import ProductFeatures from './components/ProductFeatures';
import Tutorial from './components/Tutorial';
import Gallery from './components/Gallery';
import SpecialPurposes from './components/SpecialPurposes';
import Contact from './components/Contact';
import Footer from './components/Footer';
import Preloader from './components/Preloader';
import BackToTop from './components/BackToTop';
import './App.css';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Preloader
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    // Sticky Header
    const handleScroll = () => {
      const headerNavbar = document.querySelector(".header_navbar");
      if (headerNavbar) {
        if (window.scrollY < 20) {
          headerNavbar.classList.remove("sticky");
        } else {
          headerNavbar.classList.add("sticky");
        }
      }

      // Back to top button
      const backToTop = document.querySelector(".back-to-top") as HTMLElement;
      if (backToTop) {
        if (window.scrollY > 600) {
          backToTop.style.display = "block";
        } else {
          backToTop.style.display = "none";
        }
      }

      // Section Menu Active
      const scrollLinks = document.querySelectorAll('.page-scroll');
      const scrollbarLocation = window.scrollY;

      scrollLinks.forEach((link: any) => {
        if (link.hash) {
          const section = document.querySelector(link.hash) as HTMLElement;
          if (section) {
            const sectionOffset = section.offsetTop - 73;
            if (sectionOffset <= scrollbarLocation) {
              const parent = link.parentElement;
              if (parent) {
                parent.classList.add('active');
                const siblings = Array.from(parent.parentElement?.children || []) as HTMLElement[];
                siblings.forEach((sibling) => {
                  if (sibling !== parent) {
                    sibling.classList.remove('active');
                  }
                });
              }
            }
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll);

    // Navbar toggler
    const navbarToggler = document.querySelector(".navbar-toggler");
    const navbarCollapse = document.querySelector(".navbar-collapse");
    const navLinks = document.querySelectorAll(".navbar-nav a");

    const handleToggle = () => {
      navbarToggler?.classList.toggle("active");
      navbarCollapse?.classList.toggle("show");
    };

    const handleLinkClick = () => {
      navbarCollapse?.classList.remove("show");
      navbarToggler?.classList.remove("active");
    };

    navbarToggler?.addEventListener('click', handleToggle);
    navLinks.forEach(link => link.addEventListener('click', handleLinkClick));

    // Smooth scroll for page-scroll links
    const handlePageScroll = (e: Event) => {
      const target = e.currentTarget as HTMLAnchorElement;
      if (target.hash) {
        e.preventDefault();
        const section = document.querySelector(target.hash) as HTMLElement;
        if (section) {
          window.scrollTo({
            top: section.offsetTop - 50,
            behavior: 'smooth'
          });
        }
      }
    };

    const pageScrollLinks = document.querySelectorAll('.page-scroll');
    pageScrollLinks.forEach(link => link.addEventListener('click', handlePageScroll));

    // Back to top click
    const backToTop = document.querySelector(".back-to-top");
    const handleBackToTop = (e: Event) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    };
    backToTop?.addEventListener('click', handleBackToTop);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      navbarToggler?.removeEventListener('click', handleToggle);
      navLinks.forEach(link => link.removeEventListener('click', handleLinkClick));
      pageScrollLinks.forEach(link => link.removeEventListener('click', handlePageScroll));
      backToTop?.removeEventListener('click', handleBackToTop);
    };
  }, []);

  return (
    <>
      {loading && <Preloader />}
      <Header />
      <Features />
      <About />
      <ProductFeatures />
      <Tutorial />
      <Gallery />
      <SpecialPurposes />
      <Contact />
      <Footer />
      <BackToTop />
    </>
  );
}

export default App;
