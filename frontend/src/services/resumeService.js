import { getStorage, ref, listAll, getDownloadURL, uploadBytes } from 'firebase/storage';
// Import our configured PDF.js instead of relying on react-pdftotext
import pdfjsLib from '../pdfWorkerConfig';
import PizZip from "pizzip";
import { DOMParser } from "@xmldom/xmldom";

// Helper function to parse DOCX files
function str2xml(str) {
  if (str.charCodeAt(0) === 65279) {
    // BOM sequence
    str = str.substr(1);
  }
  return new DOMParser().parseFromString(str, "text/xml");
}

// Get paragraphs from DOCX as javascript array
function getParagraphsFromDocx(content) {
  try {
    const zip = new PizZip(content);
    const xml = str2xml(zip.files["word/document.xml"].asText());
    const paragraphsXml = xml.getElementsByTagName("w:p");
    const paragraphs = [];

    for (let i = 0, len = paragraphsXml.length; i < len; i++) {
      let fullText = "";
      const textsXml = paragraphsXml[i].getElementsByTagName("w:t");
      for (let j = 0, len2 = textsXml.length; j < len2; j++) {
        const textXml = textsXml[j];
        if (textXml.childNodes && textXml.childNodes[0]) {
          fullText += textXml.childNodes[0].nodeValue;
        }
      }
      if (fullText) {
        paragraphs.push(fullText);
      }
    }
    return paragraphs.join('\n');
  } catch (error) {
    console.error("Error parsing DOCX:", error);
    throw new Error("Failed to parse DOCX file");
  }
}

export async function uploadResume(userId, file) {
  if (!userId) {
    throw new Error('Missing userId');
  }
  
  if (!file) {
    throw new Error('No file provided');
  }
  
  // Extract file extension more safely
  const parts = file.name.split('.');
  const fileExt = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  
  // Check file extension
  if (!['pdf', 'doc', 'docx', 'txt'].includes(fileExt)) {
    throw new Error('Invalid file format. Please upload PDF, DOC, DOCX, or TXT files.');
  }
  
  // Check file size - limit to 5MB
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File is too large. Maximum size is 5MB.');
  }
  
  try {
    // Create a reference to Firebase Storage
    const storage = getStorage();
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `resumes/${userId}/${fileName}`);
    
    // Log the upload attempt
    console.log('Attempting to upload file to:', storageRef.fullPath);
    
    // Set appropriate content type
    const metadata = {
      contentType: 
        fileExt === 'pdf' ? 'application/pdf' : 
        fileExt === 'doc' ? 'application/msword' : 
        fileExt === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
        'text/plain'
    };
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file, metadata);
    console.log('Uploaded file successfully!', snapshot);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('File available at', downloadURL);
    
    // Return file info
    return {
      name: fileName,
      displayName: file.name,
      url: downloadURL,
      type: fileExt,
      date: new Date().toLocaleDateString()
    };
  } catch (error) {
    console.error('Error uploading resume:', error);
    throw new Error(`Failed to upload resume: ${error.message}`);
  }
}

export async function getUserResumes(userId) {
  if (!userId) {
    console.error('Missing userId');
    return [];
  }
  
  console.log('Fetching resumes for user:', userId);
  
  try {
    const storage = getStorage();
    
    // Ensure this path matches your storage structure
    const listRef = ref(storage, `resumes/${userId}`);
    
    console.log('Fetching resumes from path:', `resumes/${userId}`);
    
    const result = await listAll(listRef);
    console.log('Files found:', result.items.length);
    
    if (result.items.length === 0) {
      console.log('No files found in directory');
      return [];
    }
    
    const files = await Promise.all(
      result.items.map(async (itemRef) => {
        try {
          const url = await getDownloadURL(itemRef);
          const name = itemRef.name;
          // Extract file extension more safely
          const parts = name.split('.');
          const extension = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
          const type = ['pdf', 'doc', 'docx'].includes(extension) ? extension : 'unknown';
          
          // Parse date from filename safely
          let uploadDate = new Date();
          try {
            const timeStamp = name.split('_')[0];
            if (timeStamp && !isNaN(parseInt(timeStamp))) {
              uploadDate = new Date(parseInt(timeStamp));
            }
          } catch (e) {
            console.error('Error parsing date from filename:', e);
          }
          
          return {
            name,
            displayName: name.substring(name.indexOf('_') + 1),
            url,
            type,
            date: uploadDate.toLocaleDateString()
          };
        } catch (error) {
          console.error('Error getting download URL for file:', itemRef.name, error);
          return null;
        }
      })
    );
    
    // Filter out any null items (failed to get URL)
    const validFiles = files.filter(file => file !== null);
    console.log('Processed resumes:', validFiles);
    return validFiles;
  } catch (error) {
    console.error('Error fetching resumes:', error);
    return [];
  }
}

export const extractTextFromDocx = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const text = getParagraphsFromDocx(content);
        resolve(text);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

// Custom PDF extraction function using our configured PDF.js
const extractTextFromPDF = (file) => {
  return new Promise((resolve, reject) => {
    // Create a FileReader to read the file
    const fileReader = new FileReader();
    
    fileReader.onload = function() {
      try {
        // Load document as array buffer
        const typedArray = new Uint8Array(this.result);
        
        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument(typedArray);
        
        loadingTask.promise.then(function(pdf) {
          console.log('PDF loaded successfully');
          
          // Array to store all page text promises
          const pageTextPromises = [];
          
          // Process each page
          for (let i = 1; i <= pdf.numPages; i++) {
            pageTextPromises.push(
              pdf.getPage(i).then(function(page) {
                return page.getTextContent().then(function(textContent) {
                  return textContent.items.map(item => item.str).join(' ');
                });
              })
            );
          }
          
          // When all pages are processed
          Promise.all(pageTextPromises).then(function(pageTexts) {
            const text = pageTexts.join('\n\n');
            resolve(text);
          });
        }).catch(function(error) {
          console.error('Error loading PDF:', error);
          reject(error);
        });
      } catch (error) {
        console.error('PDF processing error:', error);
        reject(error);
      }
    };
    
    fileReader.onerror = function() {
      reject(new Error('Error reading file'));
    };
    
    // Read the file as an ArrayBuffer
    fileReader.readAsArrayBuffer(file);
  });
};

export async function fetchResumeContent(url, type) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    let text = '';
    
    // Extract text based on file type
    if (type === 'pdf') {
      try {
        text = await extractTextFromPDF(blob);
      } catch (err) {
        console.error("PDF extraction error:", err);
        text = "Failed to extract PDF content. Please try another file.";
      }
    } else if (type === 'docx') {
      try {
        text = await extractTextFromDocx(blob);
      } catch (err) {
        console.error("DOCX extraction error:", err);
        text = "Failed to extract DOCX content. Please try another file.";
      }
    } else if (type === 'txt') {
      text = await readFileAsText(blob);
    } else {
      text = "Unsupported file type. Please use PDF, DOCX, or TXT files.";
    }
    
    return {
      text,
      fileName: url.split('/').pop(),
      fileType: type,
      url
    };
  } catch (error) {
    console.error('Error fetching resume content:', error);
    throw new Error('Failed to load resume content');
  }
} 