export const animations = {
  fadeIn: `
    animation: fadeIn 0.6s ease-out;
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,

  slideInUp: `
    animation: slideInUp 0.5s ease-out;
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,

  slideInDown: `
    animation: slideInDown 0.5s ease-out;
    @keyframes slideInDown {
      from {
        opacity: 0;
        transform: translateY(-30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,

  slideInLeft: `
    animation: slideInLeft 0.5s ease-out;
    @keyframes slideInLeft {
      from {
        opacity: 0;
        transform: translateX(-30px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `,

  slideInRight: `
    animation: slideInRight 0.5s ease-out;
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(30px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `,

  scaleIn: `
    animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,

  bounce: `
    animation: bounce 0.6s ease;
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-20px); }
    }
  `,

  pulse: `
    animation: pulse 2s infinite;
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `,

  rotate: `
    animation: rotate 1s linear infinite;
    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,

  shake: `
    animation: shake 0.5s ease-in-out;
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
  `,

  flip: `
    animation: flip 0.6s ease-out;
    @keyframes flip {
      from {
        opacity: 0;
        transform: perspective(400px) rotateY(90deg);
      }
      to {
        opacity: 1;
        transform: perspective(400px) rotateY(0deg);
      }
    }
  `,

  glow: `
    animation: glow 2s ease-in-out infinite;
    @keyframes glow {
      0%, 100% { text-shadow: 0 0 5px rgba(102, 126, 234, 0.5); }
      50% { text-shadow: 0 0 20px rgba(102, 126, 234, 1); }
    }
  `,
};

export const get3DCardStyle = (isHovering = false) => {
  return {
    perspective: '1000px',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
    transform: isHovering ? 'rotateY(5deg) rotateX(-5deg) scale(1.02)' : 'rotateY(0deg) rotateX(0deg)',
  };
};

export const applyParallax = (e, intensity = 10) => {
  const cards = document.querySelectorAll('[data-parallax]');
  const x = (window.innerWidth / 2 - e.clientX) / intensity;
  const y = (window.innerHeight / 2 - e.clientY) / intensity;
  
  cards.forEach(card => {
    card.style.transform = `translateX(${x}px) translateY(${y}px)`;
  });
};

export const createParticles = (elementId, particleCount = 20) => {
  const container = document.getElementById(elementId);
  if (!container) return;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = Math.random() * 10 + 5 + 'px';
    particle.style.height = particle.style.width;
    particle.style.background = `rgba(102, 126, 234, ${Math.random() * 0.5 + 0.2})`;
    particle.style.borderRadius = '50%';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.animation = `float ${Math.random() * 3 + 2}s infinite ease-in-out`;
    particle.style.pointerEvents = 'none';
    
    container.appendChild(particle);
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes float {
      0%, 100% { transform: translateY(0px); opacity: 0.5; }
      50% { transform: translateY(-20px); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
};

export const smoothScroll = (elementId) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

export const elementInView = (element, callback, threshold = 0.1) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold });

  observer.observe(element);
  return observer;
};
