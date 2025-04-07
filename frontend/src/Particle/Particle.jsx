import React from "react";
import {useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadFull } from "tsparticles";

const Particle=()=>{
  const [init, setInit] = useState(false);

  useEffect(() => {
    console.log("init");
    initParticlesEngine(async (engine) => {
      await loadFull(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = (container) => {};

  return (
    <>
      {init && (
        <Particles
          id="tsparticles"
          particlesLoaded={particlesLoaded}
          style={{
            zIndex: 1,
          }}
          options={{
            fpsLimit: 120,
            interactivity: {
              events: {
                onClick: {
                  enable: true,
                  mode: "push",
                },
                onHover: {
                  enable: true,
                  mode: "grab",
                  parallax: { enable: false, force: 60, smooth: 10 },
                },
                resize: true,
              },
              modes: {
                push: {
                  quantity: 4,
                },
                grab: {
                  distance: 150,
                  links: {
                    opacity: 0.5,
                  },
                  onHover: {
                    enable: true,
                    mode: "connect",
                  },
                },
              },
            },
            particles: {
              color: {
                value: "#FFFF00",
              },
              links: {
                color: "#F0F8FF",
                distance: 150,
                enable: false,
                opacity: 0.5,
                width: 3,
              },
              move: {
                direction: "none",
                enable: true,
                outModes: {
                  default: "bounce",
                },
                random: true,
                speed: 1,
                straight: false,
              },
              number: {
                density: {
                  enable: true,
                  area: 800,
                },
                value: 200,
              },
              opacity: {
                value: 0.5,
              },
              shape: {
                type: "circle",
              },
              size: {
                value: { min: 2, max: 4 },
              },
            },
            detectRetina: true,
          }}
        />
      )}
    </>
  );
}



export default Particle;