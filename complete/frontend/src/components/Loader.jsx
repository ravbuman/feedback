import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const Loader = () => {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <div className="w-48 h-48">
        <DotLottieReact
          src="https://lottie.host/47f28e3a-0bef-4c1b-b941-5d7604444622/dysZh4WMxH.lottie"
          loop
          autoplay
        />
      </div>
    </div>
  );
};

export default Loader;