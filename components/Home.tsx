import React, { useState, useEffect } from 'react';
import { PLACEHOLDER_HOME_IMAGES } from '../constants';

interface HomeProps {
  userImages?: string[];
}

const Home: React.FC<HomeProps> = ({ userImages }) => {
  const images = userImages && userImages.length > 0 ? userImages : PLACEHOLDER_HOME_IMAGES;
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 6000); // Rotate every 6 seconds
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="w-full h-full bg-white relative flex items-center justify-center p-8">
      {/* Image Container */}
      <div className="relative w-full max-w-6xl aspect-[16/9] shadow-xl overflow-hidden rounded-xl bg-gray-100">
        {images.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={img}
              alt={`Slide ${index}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;