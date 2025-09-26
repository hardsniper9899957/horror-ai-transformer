import React, { useState, useCallback } from 'react';
import ImageUploader from './components/ImageUploader';
import ControlPanel from './components/ControlPanel';
import ResultDisplay from './components/ResultDisplay';
import { transformImage, generateVideo } from './services/geminiService';
import { VIDEO_GENERATION_MESSAGES } from './constants';

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [horrorImages, setHorrorImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  
  const [prompt, setPrompt] = useState<string>('');
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [videoPrompt, setVideoPrompt] = useState<string>('');
  const [videoNegativePrompt, setVideoNegativePrompt] = useState<string>('');
  const [cameraMotion, setCameraMotion] = useState<string>('Camera Shake (Static)');
  const [isRealisticMode, setIsRealisticMode] = useState<boolean>(false);

  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<boolean>(false);
  const [videoGenerationStatus, setVideoGenerationStatus] = useState<string>('');
  const [generatedVideoUrls, setGeneratedVideoUrls] = useState<string[]>([]);
  
  const [error, setError] = useState<string | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = useCallback(async (file: File) => {
    try {
      setError(null);
      setOriginalImageFile(file);
      const base64 = await fileToBase64(file);
      setOriginalImage(base64);
      // Reset downstream results when a new image is uploaded
      setHorrorImages([]);
      setSelectedImageIndex(null);
      setGeneratedVideoUrls([]);
    } catch (err) {
      console.error(err);
      setError("Failed to read the image file.");
    }
  }, []);

  const handleTransform = useCallback(async () => {
    if (!originalImageFile) {
      setError("Please upload an image first.");
      return;
    }
    
    setIsGeneratingImage(true);
    setError(null);
    setGeneratedVideoUrls([]); // Clear previous video results
    setHorrorImages([]);
    setSelectedImageIndex(null);


    try {
      const base64String = originalImage!.split(',')[1];
      const resultBase64Array = await transformImage(
        base64String, 
        originalImageFile.type, 
        prompt, 
        negativePrompt, 
        isRealisticMode
      );
      setHorrorImages(resultBase64Array.map(img => `data:image/jpeg;base64,${img}`));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during image generation.");
    } finally {
      setIsGeneratingImage(false);
    }
  }, [originalImageFile, originalImage, prompt, negativePrompt, isRealisticMode]);

  const handleGenerateVideo = useCallback(async () => {
    if (selectedImageIndex === null || !horrorImages[selectedImageIndex]) {
      setError("Please select one of the generated horror images first.");
      return;
    }
    
    const selectedImage = horrorImages[selectedImageIndex];

    setIsGeneratingVideo(true);
    setError(null);

    try {
      // Assuming horrorImage is a data URL, we need to extract base64 and mimeType
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      const tempFile = new File([blob], "horror_image.jpeg", { type: blob.type });

      const base64String = selectedImage.split(',')[1];
      const videoUrls = await generateVideo(
        base64String,
        tempFile.type,
        setVideoGenerationStatus,
        VIDEO_GENERATION_MESSAGES,
        videoPrompt,
        videoNegativePrompt,
        cameraMotion
      );
      setGeneratedVideoUrls(videoUrls);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during video generation.");
    } finally {
      setIsGeneratingVideo(false);
    }
  }, [horrorImages, selectedImageIndex, videoPrompt, videoNegativePrompt, cameraMotion]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800">
            Horror AI Transformer
          </h1>
          <p className="mt-2 text-lg text-gray-400">Turn your photos into photorealistic nightmares.</p>
        </header>

        {error && (
          <div className="bg-red-900 border border-red-600 text-red-100 px-4 py-3 rounded-lg relative mb-6" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <main className="flex flex-col lg:flex-row -mx-4">
          <ImageUploader onImageUpload={handleImageUpload} originalImage={originalImage} />
          <ControlPanel
            prompt={prompt}
            setPrompt={setPrompt}
            negativePrompt={negativePrompt}
            setNegativePrompt={setNegativePrompt}
            videoPrompt={videoPrompt}
            setVideoPrompt={setVideoPrompt}
            videoNegativePrompt={videoNegativePrompt}
            setVideoNegativePrompt={setVideoNegativePrompt}
            cameraMotion={cameraMotion}
            setCameraMotion={setCameraMotion}
            isRealisticMode={isRealisticMode}
            setIsRealisticMode={setIsRealisticMode}
            onTransform={handleTransform}
            onGenerateVideo={handleGenerateVideo}
            isAnyImageGenerated={horrorImages.length > 0}
            isImageSelected={selectedImageIndex !== null}
            isGenerating={isGeneratingImage || isGeneratingVideo}
            hasOriginalImage={!!originalImage}
          />
          <ResultDisplay
            horrorImages={horrorImages}
            selectedImageIndex={selectedImageIndex}
            onSelectImage={setSelectedImageIndex}
            generatedVideoUrls={generatedVideoUrls}
            isGeneratingImage={isGeneratingImage}
            isGeneratingVideo={isGeneratingVideo}
            videoGenerationStatus={videoGenerationStatus}
          />
        </main>
      </div>
    </div>
  );
};

export default App;