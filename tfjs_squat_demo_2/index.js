const webcamElement = document.getElementById('webcam');
var squat_count = 0;
var lunge_count = 0;
var in_squat = 0;
var in_stand = 0;
var in_lunge = 0;

var squat_probs = [];
var stand_probs = [];
var lunge_probs = [];
var fnum = 0;
var classified = false;
var frameclass = "";
var last_state = "";

var messages = "";

const average = list => list.reduce((prev, curr) => prev + curr) / list.length;


async function setupWebcam() {
  return new Promise((resolve, reject) => {
    const navigatorAny = navigator;
    navigator.getUserMedia = navigator.getUserMedia ||
        navigatorAny.webkitGetUserMedia || navigatorAny.mozGetUserMedia ||
        navigatorAny.msGetUserMedia;
    if (navigator.getUserMedia) {
      navigator.getUserMedia({video: true},
        stream => {
          webcamElement.srcObject = stream;
          webcamElement.addEventListener('loadeddata',  () => resolve(), false);
        },
        error => reject());
    } else {
      reject();
    }
  });
}

let net;


async function app() {
  console.log('Loading mobilenet..');
  const model =  await tf.loadLayersModel('mymodel/model.json');

  // Load the model.
  net = await mobilenet.load();
  console.log('Sucessfully loaded model');

  await setupWebcam();

  // Reads an image from the webcam and associates it with a specific class
  // index.
  const addExample = classId => {
    // Get the intermediate activation of MobileNet 'conv_preds' and pass that
    // to the KNN classifier.
    const activation = net.infer(webcamElement, 'conv_preds');

    // Pass the intermediate activation to the classifier.
    classifier.addExample(activation, classId);
  };


  while (true) {
	  fnum = fnum + 1;
	  classified = false;
	  frameclass = "";
	  
      // Get the activation from mobilenet from the webcam.
      const activation = net.infer(webcamElement, 'conv_preds');
	  var ac2 = activation.expandDims(0);
      // Get the most likely class and confidences from the classifier module.
	  //console.log(activation);
      const result = await model.predict(ac2);
	  var probs = result.dataSync();
	  
	  squat_probs.push(probs[0]); // need to confirm
	  lunge_probs.push(probs[2]);
	  stand_probs.push(probs[3]);

	  var AVG_PROB_THRESH = 1.3;
	  var MIN_PROB_THRESH = 1.1;
	  var LOOKBACK = 10;

	  // standardize the probabilities
	  var squat_avg = average(squat_probs);
	  var squat_p10_avg = average(squat_probs.slice(-1*LOOKBACK));	  
	  var squat_p10_min = Math. min. apply(null, squat_probs.slice(-1*LOOKBACK)); 

	  var lunge_avg = average(lunge_probs);
	  var lunge_p10_avg = average(lunge_probs.slice(-1*LOOKBACK));	 
	  var lunge_p10_min = Math. min. apply(null, lunge_probs.slice(-1*LOOKBACK)); 		  

	  var stand_avg = average(stand_probs);
	  var stand_p10_avg = average(stand_probs.slice(-1*LOOKBACK));	  
	  var stand_p10_min = Math. min. apply(null, stand_probs.slice(-1*LOOKBACK)); 		  	  
	  
	  var msgs = document.getElementById("message").innerHTML;

	  // STAND
	  var STAND_THRESH = 0; // 0.15
	  if (stand_p10_avg > STAND_THRESH & stand_p10_avg > AVG_PROB_THRESH*stand_avg) {
		  classified = true;
		  frameclass = "stand";
	  }

	  
	  if (!classified & squat_p10_avg > squat_avg & lunge_p10_avg > lunge_avg) {
		  // determine if its 
		  if (squat_p10_avg / squat_avg > lunge_p10_avg/ lunge_avg ) {
			  frameclass = "squat";
			  classified = true;
		  } else {
			  frameclass = "lunge";
			  classified = true;
		  }
			  
	  }
	  
	  var SQUAT_THRESH = 0.3; // 0.3	  
	  if (!classified & squat_p10_avg > SQUAT_THRESH & squat_p10_avg > AVG_PROB_THRESH*squat_avg & squat_p10_min > squat_avg*MIN_PROB_THRESH) {
		  classified = true;
		  frameclass = "squat";
	  }

	  // LUNGE
	  var LUNGE_THRESH = 0; // 0.4
	  if (!classified & lunge_p10_avg > LUNGE_THRESH & lunge_p10_avg > AVG_PROB_THRESH*lunge_avg & lunge_p10_min > lunge_avg*MIN_PROB_THRESH) {
		  classified = true;
		  frameclass = "lunge";
	  }

	  
	  if (frameclass=="squat") {
		  if (last_state == "stand") {
			  in_squat += 1;
			  in_lunge = 0;
			  in_stand = 0;
		  }
		  			  
			  if (in_squat == LOOKBACK)  {
				in_squat += 1;
				squat_count += 1;
				last_state = "squat";
				document.getElementById("numlunge").innerHTML = squat_count;				
				messages = "<tr> <td> <img src='squat.png' style='height:50px;'></td><td>" + squat_count + "</td></tr>" + messages;
				//document.getElementById("message").innerHTML  = "<table>" + messages + "</table>";
			}
	  }
	  
	  if (frameclass=="lunge") {
		if (last_state == "stand") {
			  in_lunge += 1;
			  in_squat = 0;
			  in_stand = 0;
		}
			  if (in_lunge == LOOKBACK)  {
				  in_lunge += 1;
				lunge_count += 1
				last_state = "lunge";
				document.getElementById("numlunge").innerHTML = lunge_count;
				messages = "<tr> <td> <img src='lunge.png' style='height:50px;'></td><td>" + lunge_count + "</td></tr>" + messages;
				//document.getElementById("message").innerHTML  = "<table>" + messages + "</table>";				
			  }
		  
	  }

	  if (frameclass=="stand") {
		  in_stand += 1;
		  in_squat = 0;
		  in_lunge = 0;
		  /*
		  if (in_stand < LOOKBACK ) {
			document.getElementById("message").innerHTML = "";			  
		  }
		  */
		  
		  if (in_stand == LOOKBACK)  {
			if (last_state != "stand") {
				messages = "<tr> <td>Standing</td><td></td></tr>" + messages;
			} 
			  last_state = "stand";
		  }
	  }	  
	  

	document.getElementById("message").innerHTML  = "<table>" + messages + "</table>";



	if (fnum % 10 == 0) {
		console.log(fnum);
		console.log(frameclass);
		console.log(last_state);
	  console.log("LUNGES" + lunge_p10_avg);
	  console.log("SQUATS" + squat_p10_avg);	  
	  console.log("STANDING" + stand_p10_avg);	  	  
	}
/*	  
       document.getElementById('console').innerText = `
        Lunge: ${probs[0]}\n\n
        Other: ${probs[1]}\n
		Squat: ${probs[2]}\n
		Stand: ${probs[3]}\n
      `;
*/
    await tf.nextFrame();
  }
}


app();