// import React, { useState, useRef } from 'react';
// import axios from 'axios';

// function App() {
//   const [file, setFile] = useState(null);
//   const [faces, setFaces] = useState([]);
//   const videoRef = useRef(null);

//   const submitFile = () => {
//     if (file) {
//       const video = videoRef.current;
//       video.src = URL.createObjectURL(file);
//       video.play();

//       const canvas = document.createElement('canvas');
//       const context = canvas.getContext('2d');

//       setInterval(() => {
//         canvas.width = video.videoWidth;
//         canvas.height = video.videoHeight;
//         context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
//         canvas.toBlob(blob => {
//           const formData = new FormData();
//           formData.append('file', blob);

//           axios.post('http://localhost:5000/api/upload', formData, {
//             headers: {
//               'Content-Type': 'multipart/form-data'
//             }
//           }).then(response => {
//             setFaces(prevFaces => [...prevFaces, response.data.image]);
//           });
//         });
//       }, 1000);
//     } else {
//       console.log("No file selected");
//     }
//   };

//   return (
//     <div>
//       <input type="file" onChange={event => {
//         if (event.target.files) {
//           setFile(event.target.files[0]);
//         }
//       }} />
//       <button onClick={submitFile}>Submit</button>
//       <video ref={videoRef} style={{width: '30%'}} controls />
//       <div>
//         {faces.map((face, index) => (
//           <img key={index} src={`data:image/jpeg;base64,${face}`} alt={`Face ${index}`} />
//         ))}
//       </div>
//     </div>
//   );
// }

// export default App;

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null);
  const [image, setImage] = useState(null);
  const [faces, setFaces] = useState([]);
  const videoRef = useRef(null);
  const refImageRef = useRef(null);
  const intervalRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // Initial playback speed

  const [selectedFaces, setSelectedFaces] = useState([]);
  const [buttonText, setButtonText] = useState('');
  const fileInputRef = useRef(null);

  // const frameRate = 30; // Frame rate of the video
  // const processingRate = frameRate * 0.2; // 20% of the frame rate

  const [verificationResults, setVerificationResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!file && isProcessing) {
      setIsProcessing(false); // Stop processing if no file selected
    }
  }, [file, isProcessing]);

  const handleFileInputChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);

    // Clear verificationResults and selectedImages
    setVerificationResults([]);
    setSelectedFaces([]);
    // Reset the faces state
    setFaces([]);

    console.log('handleFileInputChange');
    // If a video file is selected, start processing immediately
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      console.log('handleFileInputChange submitFile');
      submitFile(selectedFile);
    }

    // If a video file is selected, start processing immediately
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      console.log('handleFileInputChange submitFile');
      sendFrameToBackend(selectedFile);
    }
  };

  const submitFile = (file) => {
    if (file && !isProcessing) {
      console.log('submitFile');
      setIsProcessing(true); // Start processing
      const video = videoRef.current;
      video.src = URL.createObjectURL(file);
      video.playbackRate = 0.4; // Adjust playback speed based on processing rate
      video.play();

      processFrame(video);
      // intervalRef.current = setInterval(() => {
      //   processFrame(video);
      // }, 1000 / processingRate);

      // video.onended = () => {
      //   clearInterval(intervalRef.current);
      // };

    } else {
      console.log("No file selected");
    }
  };

  const processFrame = (video) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // canvas.width = video.videoWidth;
    // canvas.height = video.videoHeight;
    // context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    // canvas.toBlob(blob => {
    //   sendFrameToBackend(blob);
    // }, 'image/jpeg');


    video.onloadedmetadata = () => {
      const totalDuration = video.duration; // Total duration of the video in seconds

      let currentTime = 0;
      const intervalId = setInterval(() => {
        if (currentTime >= totalDuration) {
          clearInterval(intervalId); // Stop processing after reaching the end of the video
          setIsProcessing(false);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        canvas.toBlob(blob => {
          sendFrameToBackend(blob);
        }, 'image/jpeg');

        currentTime += 1; // Increment by 1 second
        video.currentTime = currentTime; // Move to the next second
      }, 1000);
    };
  };

  const sendFrameToBackend = (blob) => {
    const formData = new FormData();
    formData.append('file', blob);

    axios.post('http://172.17.0.2:5000/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(response => {
      console.log('Received data:', response.data);
      setFaces(prevFaces => [...prevFaces, response.data.faces]);
      //setFaces(prevFaces => [...prevFaces, ...response.data.faces]);
      // Adjust playback speed based on processing rate
      setPlaybackSpeed(prevSpeed => Math.min(2, response.data.processingRate / 30)); // Example adjustment
    }).catch(error => {
      console.error('Error processing frame:', error);
    });
  };

  const toggleSelectFace = (index) => {
    const selectedIndex = selectedFaces.indexOf(index);
    let updatedSelectedFaces = [...selectedFaces];

    if (selectedIndex === -1) {
      updatedSelectedFaces.push(index);
    } else {
      updatedSelectedFaces.splice(selectedIndex, 1);
    }

    setSelectedFaces(updatedSelectedFaces);
    setButtonText(`${updatedSelectedFaces.length} faces selected`);
  };

  // Get selected image data based on selected faces
  const selectedImages = selectedFaces.map(faceIndex => {
    const faceArrayIndex = Math.floor(faceIndex / 1000); // Get frame index from combined index
    const faceIndexInFrame = faceIndex % 1000; // Get face index within the frame

    // console.log("faceArrayIndex: "+faceArrayIndex + "faceIndexInFrame: "+faceIndexInFrame);
    // Access image data based on your implementation (modify as needed)
    //const imageData = faces[faceArrayIndex][faceIndexInFrame]; // Assuming faces is an array of frames, each containing an array of face data (base64 or URL)
    // Ensure that faces[faceArrayIndex] is not undefined before accessing its elements
    const imageData = faces[faceArrayIndex] ? faces[faceArrayIndex][faceIndexInFrame] : null;

    // Optionally convert to base64 if in a different format
    //const formattedImageData = imageData.startsWith('data:') ? imageData : URL.createObjectURL(imageData);

    // console.log("imageData: " + imageData);
    // // Convert base64 to Blob (if necessary)
    // const imageBlob = imageData.startsWith('data:') ? dataURItoBlob(imageData) : new Blob([imageData], { type: 'image/jpeg' });

    return imageData;
  });

  // Function to convert data URI to Blob (if image data is base64 encoded)
  // function dataURItoBlob(dataURI) {
  //   const byteString = atob(dataURI.split(',')[1]);
  //   const mimeType = dataURI.split(',')[0].split(':')[1].split(';')[0];
  //   const arrayBuffer = new ArrayBuffer(byteString.length);
  //   const intArray = new Uint8Array(arrayBuffer);
  //   for (let i = 0; i < byteString.length; i++) {
  //     intArray[i] = byteString.charCodeAt(i);
  //   }
  //   return new Blob([arrayBuffer], { type: mimeType });
  // }

  const handleRefImageInputChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      // Handle file upload for the right panel
      setImage(event.target.files[0]);
      //const uploadedImage = event.target.files[0];
      //setSelectedFaces([...selectedFaces, uploadedImage]); // Add the uploaded image to selectedFaces array
    }
  };

  const handleVerifyFaces = () => {
    // Extract file names from selectedFaces
    // const fileNames = selectedFaces.map(file => file.name);
    // console.log('Selected Face File Names:', fileNames);
    // Send selected faces and uploaded image to Flask backend
    // const formData = new FormData();
    // formData.append('uploaded_image', image);
    //formData.append('selected_faces', selectedFaces); // Assuming selectedFaces is an array

    // Set isLoading to true when verification process starts
    setIsLoading(true);

    var base64image;
    // Ensure rightImage is in base64 format
    var reader = new FileReader();
    reader.readAsDataURL(image);
    reader.onloadend = function () {
      var base64data = reader.result;
      base64image = base64data.substr(base64data.indexOf(',') + 1);

      // console.log('uploaded_image:', base64image);

      // Send selected faces and uploaded image to Flask backend
      axios.post('http://172.17.0.2:5000/api/verify_faces', {
        selectedFaces: selectedImages,
        uploaded_image: base64image
      })
        .then(response => {
          // Update verification results state
          setVerificationResults([]);
          // console.log('response:', response);
          setVerificationResults(response.data.verification_results);
          // Set isLoading to false when verification process ends
          setIsLoading(false);
          console.log('result:', response.data.verification_results);
        }).catch(error => {
          console.error('Error performing face verification:', error);
        });
    }
  };

  function calculateMatchingScore(euclideanDistance) {
    // Normalize cosine distance to a percentage scale (0-100)
    // const normalizedDistance = (1 - cosineDistance) * 100;

    // // Round the matching score to 3 decimal places
    // const roundedScore = normalizedDistance.toFixed(3);

    // // Ensure the matching score falls within the range of 0 to 100
    // return Math.max(0, Math.min(100, roundedScore));

    // Normalize Euclidean distance to a percentage scale (0-100)
    const normalizedDistance = (1 - (euclideanDistance / 1.5)) * 100;

    // Round the matching score to 3 decimal places
    const roundedScore = normalizedDistance.toFixed(3);

    // Ensure the matching score falls within the range of 0 to 100
    return Math.max(0, Math.min(100, roundedScore));
  }

  // Function to handle clearing results
  const handleClearResults = () => {
    // Clear verificationResults and selectedImages
    setVerificationResults([]);
    setSelectedFaces([]);
  };

  return (
    <div className="p-8 flex">
      {/* Left panel */}
      {/* <div className="w-1/2 pr-4">
        <div className="mb-4">
          <input type="file" onChange={event => {
            if (event.target.files) {
              setFile(event.target.files[0]);
            }
          }} />
          <button className="ml-2 px-4 py-2 bg-blue-500 text-white rounded" onClick={submitFile}>Submit</button>
        </div>
        <div className="relative">
          <video ref={videoRef} className="w-full" controls />
          {isProcessing && <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 text-white">Processing...</div>}
        </div>
        <div className="mt-8 flex flex-wrap">
          {faces.map((faceArray, index) => (
            <div key={`frame-${index}`} className="border border-gray-300 p-2 mr-4 mb-4">
              <h3 className="mb-2">Frame {index}</h3>
              <div className="flex flex-wrap">
                {faceArray.map((face, faceIndex) => (
                  <img
                    key={`face-${index}-${faceIndex}`}
                    src={face ? `data:image/jpeg;base64,${face}` : ''}
                    alt={`Face ${index}-${faceIndex}`}
                    onError={(e) => {
                      console.error('Error loading image:', e);
                    }}
                    //className="rounded mr-2 mb-2"
                    onClick={() => toggleSelectFace(index * 1000 + faceIndex)}
                    className={`rounded mr-2 mb-2 cursor-pointer ${selectedFaces.includes(index * 1000 + faceIndex) ? 'border-4 border-blue-500' : ''}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div> */}

      {/* Left panel */}
      <div className="w-1/2 pr-4">
        <div className="mb-4">
          <input type="file" onChange={handleFileInputChange} accept="image/*, video/*" />
        </div>
        {/* Display uploaded image */}
        {file && file.type.startsWith('image/') && (
          <div className="mb-4">
            <img src={URL.createObjectURL(file)} alt="Uploaded Image" className="max-w-full" />
          </div>
        )}
        {/* Display video player */}
        {/* <button className="ml-2 px-4 py-2 bg-blue-500 text-white rounded" onClick={submitFile}>Submit</button> */}
        {/* {file && file.type.startsWith('video/') && (
          <div className="relative mb-4">
            <video ref={videoRef} className="w-full" controls />
            {isProcessing && <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 text-white">Processing...</div>}
          </div>
        )} */}
        {/* Display video player */}
        <div className={`relative mb-4 ${file && file.type.startsWith('video/') ? '' : 'hidden'}`}>
          <video ref={videoRef} className="w-full" controls />
          {isProcessing && <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 text-white">Processing...</div>}
        </div>

        {/* {file && file.type.startsWith('video/') &&  */}
        <div className="mt-8 flex flex-wrap">
          {faces.map((faceArray, index) => (
            <div key={`frame-${index}`} className="border border-gray-300 p-2 mr-4 mb-4">
              <h3 className="mb-2">Frame {index}</h3>
              <div className="flex flex-wrap">
                {faceArray.map((face, faceIndex) => (
                  <img
                    key={`face-${index}-${faceIndex}`}
                    src={face ? `data:image/jpeg;base64,${face}` : ''}
                    alt={`Face ${index}-${faceIndex}`}
                    onError={(e) => {
                      console.error('Error loading image:', e);
                    }}
                    //className="rounded mr-2 mb-2"
                    onClick={() => toggleSelectFace(index * 1000 + faceIndex)}
                    className={`rounded mr-2 mb-2 cursor-pointer ${selectedFaces.includes(index * 1000 + faceIndex) ? 'border-4 border-blue-500' : ''}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* } */}
      </div>

      {/* Right panel */}
      <div className="w-1/2 pl-4">
        {/* Empty panel for additional UI components */}
        <div className="mb-4">
          <input type="file" onChange={handleRefImageInputChange} ref={refImageRef} style={{ display: 'none' }} />
          {/* <button className="ml-2 px-4 py-2 bg-blue-500 text-white rounded" onClick={() => refImageRef.current.click()}>Select Image</button> */}
        </div>
        <div
          className="border border-gray-300 p-4"
          onClick={() => refImageRef.current.click()}
          style={{ cursor: 'pointer' }}
        >
          {image ? (
            <img src={URL.createObjectURL(image)} alt="Uploaded Image" className="" />
          ) : (
            <div className="flex items-center justify-center h-full">
              Click here to select an image
            </div>
          )}
        </div>
        {/* {selectedFaces.length > 0 && (
          <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">{buttonText}</button>
        )} */}

        {/* {selectedFaces.length > 0 && (
          <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded" onClick={handleVerifyFaces}>{buttonText},Compare Faces</button>
        )} */}
        {selectedFaces.length > 0 && (
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded flex items-center"
            onClick={handleVerifyFaces}
          >
            {isLoading && (
              <div className="mr-2 border border-t-4 border-white rounded-full h-5 w-5 animate-spin"></div>
            )}
            {buttonText}, Compare Faces
          </button>
        )}

        {verificationResults.length > 0 && (
          <div className="mt-4 p-4 bg-stone-100 rounded shadow-md relative">
            <h3 className="text-lg font-semibold mb-4">Face Verification Results</h3>
            {/* Clear Results button */}
            <button
              onClick={handleClearResults}
              className="absolute top-0 right-0 p-2 focus:outline-none"
            >
              {/* Cross icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <ul className="mt-4">
              {verificationResults.map((verification_result, index) => (
                <li key={index} className="mb-4 flex items-center">
                  {/* Display corresponding selected face image on the left side */}
                  {selectedImages[index] && (
                    <img
                      src={`data:image/jpeg;base64,${selectedImages[index]}`}
                      alt={`Selected Face ${index}`}
                      className="w-20 h-20 object-cover rounded mr-4"
                    />
                  )}
                  <div>
                    {verification_result.verified ? (
                      <span className="text-green-500 font-semibold">Faces Match</span>
                    ) : (
                      <span className="text-red-500 font-semibold">Faces Do Not Match</span>
                    )}
                    <br />
                    <span className="text-gray-500">
                      Matching: {calculateMatchingScore(verification_result.distance)}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
