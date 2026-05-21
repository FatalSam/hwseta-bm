'use client';

import React, { useState, useEffect } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Wifi, WifiOff } from 'lucide-react';

interface LiveWebinarPlayerProps {
  playbackId?: string;
  streamKey?: string;
  youtubeUrl?: string;
  title?: string;
  description?: string;
  isLive?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

const LiveWebinarPlayer: React.FC<LiveWebinarPlayerProps> = ({
  playbackId,
  streamKey,
  youtubeUrl,
  title = "Live Webinar",
  description = "Join our live webinar session",
  isLive = true,
  onPlay,
  onPause,
  onEnded
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');

  // Simulate connection status for demo purposes
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionStatus(prev => {
        if (prev === 'connecting') return 'connected';
        if (prev === 'connected') return Math.random() > 0.9 ? 'disconnected' : 'connected';
        return 'connecting';
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handlePlay = () => {
    setIsPlaying(true);
    onPlay?.();
  };

  const handlePause = () => {
    setIsPlaying(false);
    onPause?.();
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    onEnded?.();
  };

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeVideoId = youtubeUrl ? getYouTubeVideoId(youtubeUrl) : null;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-blue-100 text-sm mt-1">{description}</p>
          </div>
          <div className="flex items-center space-x-2">
            {/* Live indicator */}
            {isLive && (
              <div className="flex items-center space-x-1 bg-red-500 px-2 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-xs font-medium">LIVE</span>
              </div>
            )}
            
            {/* Connection status */}
            <div className="flex items-center space-x-1">
              {connectionStatus === 'connected' ? (
                <Wifi className="w-4 h-4 text-green-300" />
              ) : connectionStatus === 'disconnected' ? (
                <WifiOff className="w-4 h-4 text-red-300" />
              ) : (
                <div className="w-4 h-4 border-2 border-yellow-300 border-t-transparent rounded-full animate-spin"></div>
              )}
              <span className="text-xs text-blue-100 capitalize">{connectionStatus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Player */}
      <div className="relative bg-black">
        {youtubeVideoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=0&controls=1&modestbranding=1&rel=0&showinfo=0&fs=1&cc_load_policy=0&iv_load_policy=3&autohide=0`}
            title={title}
            className="w-full h-64 md:h-80 lg:h-96"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={() => {
              setIsPlaying(true);
              onPlay?.();
            }}
          />
        ) : playbackId ? (
          <MuxPlayer
            playbackId={playbackId}
            streamType="on-demand"
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
            muted={isMuted}
            className="w-full h-64 md:h-80 lg:h-96"
            style={{
              '--controls-backdrop-color': 'rgba(0, 0, 0, 0.6)',
              '--controls-backdrop-blur': '8px',
            } as React.CSSProperties}
          />
        ) : streamKey ? (
          <div className="w-full h-64 md:h-80 lg:h-96 bg-gray-900 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Live Stream Ready</h3>
              <p className="text-gray-300 text-sm">Stream Key: {streamKey.substring(0, 8)}...</p>
              <p className="text-gray-400 text-xs mt-2">Configure your streaming software with this key</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-64 md:h-80 lg:h-96 bg-gray-900 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Stream Available</h3>
              <p className="text-gray-300 text-sm">Live webinar will start soon</p>
            </div>
          </div>
        )}

        {/* Custom Controls Overlay - Only show for non-YouTube videos */}
        {!youtubeVideoId && (
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>
              
              <button
                onClick={handleMuteToggle}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleFullscreenToggle}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all"
              >
                <Maximize className="w-5 h-5 text-white" />
              </button>
              
              <button className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all">
                <Settings className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Viewers: {Math.floor(Math.random() * 1000) + 50}</span>
            <span>Quality: HD</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Streaming</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveWebinarPlayer;
