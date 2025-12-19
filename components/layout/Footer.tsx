import React from 'react';
import { SITE_CONFIG } from '../../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-brand-white pt-32 pb-12 border-t border-brand-soft/50" role="contentinfo">
      <div className="max-w-screen-2xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-end gap-10">

        {/* Contact Information */}
        <div className="space-y-6">
          <div className="text-brand-power font-bold text-2xl tracking-tighter">
            {SITE_CONFIG.h1}
          </div>
          <a
            href={`mailto:${SITE_CONFIG.contactEmail}`}
            className="block text-brand-power hover:text-brand-accent transition-colors duration-300 text-lg font-light"
            aria-label={`Enviar correo a ${SITE_CONFIG.contactEmail}`}
          >
            {SITE_CONFIG.contactEmail}
          </a>
          <p className="text-brand-power/30 text-xs mt-12 font-mono uppercase tracking-widest">
            © {new Date().getFullYear()} {SITE_CONFIG.author}.
          </p>
        </div>

        {/* Socials Removed per User Request */}
        <nav className="flex gap-8" aria-label="Redes Sociales">
          {/* Social links removed */}
        </nav>
      </div>
    </footer>
  );
};

export default Footer;