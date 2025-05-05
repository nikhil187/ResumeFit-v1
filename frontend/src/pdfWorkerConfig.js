// This file configures PDF.js for compatibility with all imports
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Use a CDN URL with http/https protocol (not just // protocol) to avoid CORS issues
// Using version 2.16.105 which matches our package.json dependencies
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.js`;

export default pdfjsLib; 