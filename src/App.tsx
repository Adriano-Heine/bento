import { useState, useRef, useEffect, MouseEvent } from 'react';
import { ArrowLeft, Download, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

// URL padrão do vídeo e nome (podem ser substituídos dinamicamente via query params se desejado)
export const DEFAULT_VIDEO_URL = "https://res.cloudinary.com/dfbsag282/video/upload/v1788355137/bento_o1gxij.mp4";
export const DEFAULT_PET_NAME = "Bento";

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [petName, setPetName] = useState(DEFAULT_PET_NAME);
  const [videoUrl, setVideoUrl] = useState(DEFAULT_VIDEO_URL);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  // Ler parâmetros de URL caso sejam fornecidos (ex: ?nome=Bento&video=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlNome = params.get('nome') || params.get('name');
      const urlVideo = params.get('video') || params.get('url');

      if (urlNome) setPetName(urlNome);
      if (urlVideo) setVideoUrl(urlVideo);
    } catch {
      // fallback para os valores padrão
    }
  }, []);

  // Solicitar modo tela cheia do navegador
  const requestBrowserFullscreen = () => {
    const elem = containerRef.current || document.documentElement;
    const video = videoRef.current;

    try {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if ((elem as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        (elem as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen()?.catch?.(() => {});
      } else if ((elem as unknown as { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen) {
        (elem as unknown as { msRequestFullscreen: () => Promise<void> }).msRequestFullscreen()?.catch?.(() => {});
      } else if (video && (video as unknown as { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen) {
        (video as unknown as { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
      }
    } catch (e) {
      console.warn('Tela cheia não suportada ou bloqueada no contexto atual:', e);
    }
  };

  // Sair do modo tela cheia do navegador
  const exitBrowserFullscreen = () => {
    try {
      const fsElement =
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement;

      if (fsElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
          (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen()?.catch?.(() => {});
        }
      }
    } catch (e) {
      console.warn('Erro ao sair de tela cheia:', e);
    }
  };

  // Iniciar reprodução e disparar transição
  const handleStart = () => {
    const video = videoRef.current;
    
    // Inicia a transição de fade imediatamente
    setHasStarted(true);

    if (video) {
      video.load();
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          video.muted = true;
          video.play().catch((err) => {
            console.error('Erro ao reproduzir vídeo:', err);
          });
        });
      }
    }

    requestBrowserFullscreen();
  };

  // Voltar para a tela inicial
  const handleBackToStart = (e: MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
    exitBrowserFullscreen();
    setHasStarted(false);
  };

  // Assegurar que o vídeo continue em loop contínuo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  return (
    <div
      id="video-container"
      ref={containerRef}
      onClick={() => {
        if (!hasStarted) {
          handleStart();
        } else {
          requestBrowserFullscreen();
        }
      }}
      className="fixed inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden select-none cursor-pointer"
    >
      {/* Botão discreto para voltar à tela inicial */}
      {hasStarted && (
        <button
          id="back-button"
          type="button"
          onClick={handleBackToStart}
          aria-label="Voltar para a tela inicial"
          className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md border border-neutral-800 hover:border-neutral-600 text-neutral-400 hover:text-white text-xs font-light tracking-widest uppercase transition-all duration-300 opacity-70 hover:opacity-100 cursor-pointer shadow-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar</span>
        </button>
      )}

      {/* Vídeo ocupando a tela com proporção preservada */}
      <video
        id="main-video"
        ref={videoRef}
        key={videoUrl}
        loop
        playsInline
        webkit-playsinline="true"
        preload="auto"
        className="w-full h-full object-contain bg-black"
      >
        <source src={videoUrl} type="video/mp4" />
        Seu navegador não suporta a tag de vídeo.
      </video>

      {/* Camada inicial escura com efeito de transição suave (Fade) */}
      <div
        id="controls-overlay"
        className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-black transition-all duration-1000 ease-in-out ${
          hasStarted ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
        }`}
      >
        <div className="flex flex-col items-center gap-7">
          <h1
            id="app-title"
            className="text-neutral-400 text-2xl md:text-3xl font-light tracking-[0.35em] uppercase select-none transition-opacity duration-700"
          >
            {petName}
          </h1>

          <button
            id="start-button"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStart();
            }}
            className="px-8 py-2.5 border border-neutral-800 hover:border-neutral-500 bg-neutral-950 text-neutral-300 hover:text-white text-xs font-medium tracking-[0.3em] uppercase rounded-full shadow-lg transition-all duration-300 active:scale-95 cursor-pointer"
          >
            Iniciar
          </button>
        </div>

        {/* Botão sutil de Instalação PWA na tela inicial quando não instalado */}
        {!isInstalled && (isInstallable || isIOS) && (
          <div className="absolute bottom-6 flex flex-col items-center">
            {isInstallable ? (
              <button
                id="pwa-install-button"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  install();
                }}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-neutral-800/80 bg-neutral-950/80 hover:bg-neutral-900 text-neutral-500 hover:text-neutral-300 text-[11px] font-light tracking-wider transition-all duration-300 shadow-sm"
              >
                <Download className="w-3 h-3" />
                <span>Instalar Aplicativo</span>
              </button>
            ) : isIOS ? (
              <button
                id="ios-install-button"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowIOSGuide(true);
                }}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-neutral-800/80 bg-neutral-950/80 hover:bg-neutral-900 text-neutral-500 hover:text-neutral-300 text-[11px] font-light tracking-wider transition-all duration-300 shadow-sm"
              >
                <Download className="w-3 h-3" />
                <span>Adicionar à Tela de Início</span>
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Modal Guia iOS Safari */}
      {showIOSGuide && (
        <div
          id="ios-guide-modal"
          onClick={(e) => {
            e.stopPropagation();
            setShowIOSGuide(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-neutral-950 border border-neutral-800 p-6 shadow-2xl text-neutral-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-medium tracking-wide uppercase text-neutral-300">
                Adicionar ao iPhone
              </h3>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 text-xs text-neutral-400 space-y-3 leading-relaxed">
              <p>
                1. Toque no botão de <strong>Compartilhar</strong> (ícone de quadrado com seta para cima) na barra do Safari.
              </p>
              <p>
                2. Role para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.
              </p>
              <p>
                3. O ícone de <strong>{petName}</strong> aparecerá na tela do seu celular como um aplicativo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium tracking-wide uppercase transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
