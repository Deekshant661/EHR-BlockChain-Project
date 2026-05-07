// require('dotenv').config();
// 'use strict';

// const express = require('express');
// const helper = require('./helper');
// const invoke = require('./invoke');
// const query = require('./query');
// const cors = require('cors');

// const app = express();
// app.use(express.json());
// app.use(cors());

// app.listen(5000, function () {
//     console.log('Node SDK server is running on 5000 port :) ');
// });

// app.get('/status', async function (req, res, next) {
//     res.send("Server is up.");
// })


// app.post('/registerPatient', async function (req, res, next) {
//     try {
//         let role; 
//         let {adminId, doctorId, userId, name, dob, city} = req.body;

//         // check request body
//         console.log("Received request:", req.body);
//         if (req.body.userId && req.body.adminId) {
//             userId = req.body.userId;
            
//             adminId = req.body.adminId;
//         } else {
//             console.log("Missing input data. Please enter all the user details.");
//             throw new Error("Missing input data. Please enter all the user details.");
//         }
        
//         role='patient';

//         //call registerEnrollUser function and pass the above as parameters to the function
//         const result = await helper.registerUser(adminId, doctorId, userId, role, { name, dob, city});
//         console.log("Result from user registration function:", result);

//         // check register function response and set API response accordingly 
//         res.status(200).send(result);
//     } catch (error) {
//         console.log("There was an error while registering the user. Error is ", error);
//         next(error);
//     }  
// });

// app.post('/loginPatient', async function (req, res, next){
//     try {
//         let userId;

//         // check request body        
//         if (req.body.userId) {
//             userId = req.body.userId;
            
//         } else {
//             console.log("Missing input data. Please enter all the user details.");
//             throw new Error("Missing input data. Please enter all the user details.");
//         }

//         const result = await helper.login(userId);
//         console.log("Result from user login function: ", result);
//         //check response returned by login function and set API response accordingly
//         res.status(200).send(result);
//     } catch (error) {
//         console.log("There was an error while logging in. Error is ", error);
//         next(error);
//     }

// });


// app.post('/queryHistoryOfAsset', async function (req, res, next){
//     try {
//         //  queryHistory(ctx, Id)
//         let userId = req.body.userId;
//         let recordId = req.body.recordId;
      
//         const result = await query.getQuery('queryHistoryOfAsset',{recordId}, userId);
//         // console.log("Response from chaincode", result);
//         //check response returned by login function and set API response accordingly
//         res.status(200).send(JSON.parse(result.data));
//     } catch (error) {       
//         next(error);
//     }
// });


// app.post('/addRecord', async function (req, res, next){
//     try {
//         //  Only doctors can add records
//         const {userId, patientId, diagnosis, prescription} = req.body;
//         const result = await invoke.invokeTransaction('addRecord', {patientId, diagnosis, prescription}, userId);
              
//         res.send({sucess:true, data: result})
                
//     } catch (error) {       
//         next(error);
//     }
// });


// app.post('/getAllRecordsByPatientId', async function (req, res, next){
//     try {
//         // getAllRecordsByPatientId(ctx, patientId
//         const {userId, patientId} = req.body;  
//         const result = await query.getQuery('getAllRecordsByPatientId',{patientId}, userId);

//         console.log("Response from chaincode", result);
//         res.status(200).send({ success: true, data:result});

//     } catch (error) {       
//         next(error);
//     }
// });

// app.post('/getRecordById', async function (req, res, next){
//     try {
//         // getRecordById(ctx, patientId, recordId)
//         const {userId, patientId, recordId} = req.body;  
//         const result = await query.getQuery('getRecordById',{patientId, recordId}, userId);

//         console.log("Response from chaincode", result);
//         res.status(200).send({ success: true, data:result});

//     } catch (error) {       
//         next(error);
//     }
// });

// app.post('/grantAccess', async function (req, res, next){
//     try {
//         // call this from patient 
//         // grantAccess(ctx, patientId, doctorIdToGrant) - call by patient
//         const {userId, patientId, doctorIdToGrant} = req.body;  
//         const result = await invoke.invokeTransaction('grantAccess',{patientId:patientId, doctorIdToGrant:doctorIdToGrant}, userId);

//         console.log("Response from chaincode", result);
//         res.status(200).send({ success: true, data:result});

//     } catch (error) {       
//         next(error);
//     }
// });

// // create Faucet Wallet only admin can call.
// // fetchLedger(ctx, timeStamp, amount, timeDelay)
// app.post('/fetchLedger', async function (req, res, next){
//     try {
//         let userId = req.body.userId;
//         // fetchLedger(ctx)
//         const result = await query.getQuery('fetchLedger', {}, userId);
//         console.log("Response from chaincode", result);
//         //check response returned by login function and set API response accordingly
//             res.status(200).send({ success: true, data:result})

//     } catch (error) {       
//         next(error);
//     }
// });

// const { google } = require('googleapis');

// // 1. Initialize the Google connection using the keys from your .env file
// const oauth2Client = new google.auth.OAuth2(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   process.env.GOOGLE_REDIRECT_URI
// );

// // 2. ROUTE: Start the Google Login process
// // URL: http://localhost:5000/auth/google
// app.get('/auth/google', (req, res) => {
//   const url = oauth2Client.generateAuthUrl({
//     access_type: 'offline',
//     scope: [
//       'https://www.googleapis.com/auth/fitness.heart_rate.read',
//       'https://www.googleapis.com/auth/fitness.activity.read'
//     ],
//   });
//   res.redirect(url);
// });

// // 3. ROUTE: Google sends the user back here after login
// app.get('/auth/google/callback', async (req, res, next) => {
//   try {
//     const { code } = req.query;
//     const { tokens } = await oauth2Client.getToken(code);
//     oauth2Client.setCredentials(tokens);
//     res.send("Successfully connected to Google Fit! You can now close this tab and go to /syncWatch.");
//   } catch (error) {
//     next(error);
//   }
// });

// // 4. ROUTE: Fetch the watch data and save it to the Blockchain
// // URL: http://localhost:5000/syncWatch
// //THE SHARED LOGIC: This function does the actual work
// async function performWatchSync() {
//     console.log("--- Background Sync Starting ---");
//     const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    
//     // Fetch steps from Google Fit
//     const stepResult = await fitness.users.dataset.aggregate({
//         userId: 'me',
//         requestBody: {
//             aggregateBy: [{ dataSourceId: "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps" }],
//             bucketByTime: { durationMillis: 86400000 },
//             startTimeMillis: new Date().setHours(0,0,0,0),
//             endTimeMillis: Date.now()
//         }
//     });

//     // Generate Vitals
//     const simulatedHR = Math.floor(Math.random() * (85 - 70 + 1)) + 70;
//     const systolic = Math.floor(Math.random() * (130 - 110 + 1)) + 110;
//     const diastolic = Math.floor(Math.random() * (85 - 70 + 1)) + 70;
//     const simulatedBP = `${systolic}/${diastolic} mmHg`;
//     const steps = stepResult.data.bucket[0].dataset[0].point[0]?.value[0]?.intVal || 0;

//     // Push to Hyperledger Fabric
//     const blockchainRes = await invoke.invokeTransaction(
//         'addRecord', 
//         { 
//             patientId: "p1", 
//             diagnosis: `Wearable Sync - HR: ${simulatedHR}bpm, BP: ${simulatedBP}, Steps: ${steps}`, 
//             prescription: "Automatic Vitals Update" 
//         }, 
//         "Doctor-DrRaj04" 
//     );
    
//     return { simulatedHR, simulatedBP, steps, blockchainRes };
// }

// //THE MANUAL ROUTE: Triggered when you visit the page in your browser
// app.get('/syncWatch', async (req, res, next) => {
//     try {
//         const result = await performWatchSync();
//         res.send({
//             success: true,
//             message: "Manual sync successful!",
//             dataCommit: { hr: result.simulatedHR, bp: result.simulatedBP, steps: result.steps },
//             blockchain: result.blockchainRes
//         });
//     } catch (error) {
//         console.error("Manual sync failed:", error.message);
//         next(error);
//     }
// });

// //THE INTERVAL: Triggered automatically every 30 minutes
// setInterval(async () => {
//     try {
//         await performWatchSync();
//         console.log("--- Background Sync Completed Successfully ---");
//     } catch (error) {
//         console.error("Background sync failed (Auth may have expired):", error.message);
//     }
// }, 30 * 60 * 1000);

// app.use((err, req, res, next) => {
//     res.status(400).send(err.message);
// })



// 'use strict';

// const express = require('express');
// const helper = require('./helper');
// const invoke = require('./invoke');
// const query = require('./query');
// const cors = require('cors');

// const app = express();
// app.use(express.json());
// app.use(cors());

// app.listen(5000, function () {
//     console.log('Node SDK server is running on 5000 port :) ');
// });

// app.get('/status', async function (req, res, next) {
//     res.send("Server is up.");
// })


// app.post('/registerPatient', async function (req, res, next) {
//     try {
//         let role; 
//         let {adminId, doctorId, userId, name, dob, city} = req.body;

//         // check request body
//         console.log("Received request:", req.body);
//         if (req.body.userId && req.body.adminId) {
//             userId = req.body.userId;
            
//             adminId = req.body.adminId;
//         } else {
//             console.log("Missing input data. Please enter all the user details.");
//             throw new Error("Missing input data. Please enter all the user details.");
//         }
        
//         role='patient';

//         //call registerEnrollUser function and pass the above as parameters to the function
//         const result = await helper.registerUser(adminId, doctorId, userId, role, { name, dob, city});
//         console.log("Result from user registration function:", result);

//         // check register function response and set API response accordingly 
//         res.status(200).send(result);
//     } catch (error) {
//         console.log("There was an error while registering the user. Error is ", error);
//         next(error);
//     }  
// });

// app.post('/loginPatient', async function (req, res, next){
//     try {
//         let userId;

//         // check request body        
//         if (req.body.userId) {
//             userId = req.body.userId;
            
//         } else {
//             console.log("Missing input data. Please enter all the user details.");
//             throw new Error("Missing input data. Please enter all the user details.");
//         }

//         const result = await helper.login(userId);
//         console.log("Result from user login function: ", result);
//         //check response returned by login function and set API response accordingly
//         res.status(200).send(result);
//     } catch (error) {
//         console.log("There was an error while logging in. Error is ", error);
//         next(error);
//     }

// });


// app.post('/queryHistoryOfAsset', async function (req, res, next){
//     try {
//         //  queryHistory(ctx, Id)
//         let userId = req.body.userId;
//         let recordId = req.body.recordId;
      
//         const result = await query.getQuery('queryHistoryOfAsset',{recordId}, userId);
//         // console.log("Response from chaincode", result);
//         //check response returned by login function and set API response accordingly
//         res.status(200).send(JSON.parse(result.data));
//     } catch (error) {       
//         next(error);
//     }
// });


// app.post('/addRecord', async function (req, res, next){
//     try {
//         //  Only doctors can add records
//         const {userId, patientId, diagnosis, prescription} = req.body;
//         const result = await invoke.invokeTransaction('addRecord', {patientId, diagnosis, prescription}, userId);
              
//         res.send({sucess:true, data: result})
                
//     } catch (error) {       
//         next(error);
//     }
// });


// app.post('/getAllRecordsByPatientId', async function (req, res, next){
//     try {
//         // getAllRecordsByPatientId(ctx, patientId
//         const {userId, patientId} = req.body;  
//         const result = await query.getQuery('getAllRecordsByPatientId',{patientId}, userId);

//         console.log("Response from chaincode", result);
//         res.status(200).send({ success: true, data:result});

//     } catch (error) {       
//         next(error);
//     }
// });

// app.post('/getRecordById', async function (req, res, next){
//     try {
//         // getRecordById(ctx, patientId, recordId)
//         const {userId, patientId, recordId} = req.body;  
//         const result = await query.getQuery('getRecordById',{patientId, recordId}, userId);

//         console.log("Response from chaincode", result);
//         res.status(200).send({ success: true, data:result});

//     } catch (error) {       
//         next(error);
//     }
// });

// app.post('/grantAccess', async function (req, res, next){
//     try {
//         // call this from patient 
//         // grantAccess(ctx, patientId, doctorIdToGrant) - call by patient
//         const {userId, patientId, doctorIdToGrant} = req.body;  
//         const result = await invoke.invokeTransaction('grantAccess',{patientId:patientId, doctorIdToGrant:doctorIdToGrant}, userId);

//         console.log("Response from chaincode", result);
//         res.status(200).send({ success: true, data:result});

//     } catch (error) {       
//         next(error);
//     }
// });

// // create Faucet Wallet only admin can call.
// // fetchLedger(ctx, timeStamp, amount, timeDelay)
// app.post('/fetchLedger', async function (req, res, next){
//     try {
//         let userId = req.body.userId;
//         // fetchLedger(ctx)
//         const result = await query.getQuery('fetchLedger', {}, userId);
//         console.log("Response from chaincode", result);
//         //check response returned by login function and set API response accordingly
//             res.status(200).send({ success: true, data:result})

//     } catch (error) {       
//         next(error);
//     }
// });


// app.use((err, req, res, next) => {
//     res.status(400).send(err.message);
// })






'use strict';

const express = require('express');
const helper = require('./helper');
const invoke = require('./invoke');
const query = require('./query');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

app.listen(5000, function () {
    console.log('Node SDK server is running on 5000 port :) ');
});

app.get('/status', async function (req, res, next) {
    res.send("Server is up.");
})


app.post('/registerPatient', async function (req, res, next) {
    try {
        let role; 
        let {adminId, doctorId, userId, name, dob, city} = req.body;

        // check request body
        console.log("Received request:", req.body);
        if (req.body.userId && req.body.adminId) {
            userId = req.body.userId;
            
            adminId = req.body.adminId;
        } else {
            console.log("Missing input data. Please enter all the user details.");
            throw new Error("Missing input data. Please enter all the user details.");
        }
        
        role='patient';

        //call registerEnrollUser function and pass the above as parameters to the function
        const result = await helper.registerUser(adminId, doctorId, userId, role, { name, dob, city});
        console.log("Result from user registration function:", result);

        // check register function response and set API response accordingly 
        res.status(200).send(result);
    } catch (error) {
        console.log("There was an error while registering the user. Error is ", error);
        next(error);
    }  
});

app.post('/loginPatient', async function (req, res, next){
    try {
        let userId;

        // check request body        
        if (req.body.userId) {
            userId = req.body.userId;
            
        } else {
            console.log("Missing input data. Please enter all the user details.");
            throw new Error("Missing input data. Please enter all the user details.");
        }

        const result = await helper.login(userId);
        console.log("Result from user login function: ", result);
        //check response returned by login function and set API response accordingly
        res.status(200).send(result);
    } catch (error) {
        console.log("There was an error while logging in. Error is ", error);
        next(error);
    }

});


app.post('/queryHistoryOfAsset', async function (req, res, next){
    try {
        //  queryHistory(ctx, Id)
        let userId = req.body.userId;
        let recordId = req.body.recordId;
      
        const result = await query.getQuery('queryHistoryOfAsset',{recordId}, userId);
        // console.log("Response from chaincode", result);
        //check response returned by login function and set API response accordingly
        res.status(200).send(JSON.parse(result.data));
    } catch (error) {       
        next(error);
    }
});


app.post('/addRecord', async function (req, res, next){
    try {
        //  Only doctors can add records
        const {userId, patientId, diagnosis, prescription} = req.body;
        const result = await invoke.invokeTransaction('addRecord', {patientId, diagnosis, prescription}, userId);
              
        res.send({sucess:true, data: result})
                
    } catch (error) {       
        next(error);
    }
});


app.post('/getAllRecordsByPatientId', async function (req, res, next){
    try {
        // getAllRecordsByPatientId(ctx, patientId
        const {userId, patientId} = req.body;  
        const result = await query.getQuery('getAllRecordsByPatientId',{patientId}, userId);

        console.log("Response from chaincode", result);
        res.status(200).send({ success: true, data:result});

    } catch (error) {       
        next(error);
    }
});

app.post('/getRecordById', async function (req, res, next){
    try {
        // getRecordById(ctx, patientId, recordId)
        const {userId, patientId, recordId} = req.body;  
        const result = await query.getQuery('getRecordById',{patientId, recordId}, userId);

        console.log("Response from chaincode", result);
        res.status(200).send({ success: true, data:result});

    } catch (error) {       
        next(error);
    }
});

app.post('/grantAccess', async function (req, res, next){
    try {
        // call this from patient 
        // grantAccess(ctx, patientId, doctorIdToGrant) - call by patient
        const {userId, patientId, doctorIdToGrant} = req.body;  
        const result = await invoke.invokeTransaction('grantAccess',{patientId:patientId, doctorIdToGrant:doctorIdToGrant}, userId);

        console.log("Response from chaincode", result);
        res.status(200).send({ success: true, data:result});

    } catch (error) {       
        next(error);
    }
});

// create Faucet Wallet only admin can call.
// fetchLedger(ctx, timeStamp, amount, timeDelay)
app.post('/fetchLedger', async function (req, res, next){
    try {
        let userId = req.body.userId;
        // fetchLedger(ctx)
        const result = await query.getQuery('fetchLedger', {}, userId);
        console.log("Response from chaincode", result);
        //check response returned by login function and set API response accordingly
            res.status(200).send({ success: true, data:result})

    } catch (error) {       
        next(error);
    }
});


// ─────────────────────────────────────────────────────────────────────────────
// NEW ROUTES — added below. Original code above is untouched.
// ─────────────────────────────────────────────────────────────────────────────

// get patient details by id
// getPatientById(ctx, patientId) - call by patient (own), authorized doctor, hospital, insurance
app.post('/getPatientById', async function (req, res, next){
    try {
        const {userId, patientId} = req.body;
        const result = await query.getQuery('getPatientById', {patientId}, userId);

        console.log("Response from chaincode", result);
        res.status(200).send({ success: true, data: result});

    } catch (error) {
        next(error);
    }
});

// get all patients — hospital only
app.post('/getAllPatients', async function (req, res, next){
    try {
        const {userId} = req.body;
        // getAllPatients takes no args on-chain, pass {}
        const result = await query.getQuery('getAllPatients', {}, userId);

        console.log("Response from chaincode", result);
        res.status(200).send({ success: true, data: result});

    } catch (error) {
        next(error);
    }
});

// get all records written by a specific doctor
// getRecordsByDoctor(ctx, doctorId) - call by that doctor or hospital
app.post('/getRecordsByDoctor', async function (req, res, next){
    try {
        const {userId, doctorId} = req.body;
        const result = await query.getQuery('getRecordsByDoctor', {doctorId}, userId);

        console.log("Response from chaincode", result);
        res.status(200).send({ success: true, data: result});

    } catch (error) {
        next(error);
    }
});

// revoke access — patient revokes a doctor's access to their records
// revokeAccess(ctx, patientId, doctorIdToRevoke) - call by patient
app.post('/revokeAccess', async function (req, res, next){
    try {
        const {userId, patientId, doctorIdToRevoke} = req.body;
        const result = await invoke.invokeTransaction('revokeAccess', {patientId, doctorIdToRevoke}, userId);

        console.log("Response from chaincode", result);
        res.status(200).send({ success: true, data: result});

    } catch (error) {
        next(error);
    }
});

// issue insurance — insurance agent issues a policy to a patient
// issueInsurance(ctx, patientId, coverageAmount, policyType, validFrom, validTo) - call by insuranceAgent/insuranceAdmin
app.post('/issueInsurance', async function (req, res, next){
    try {
        const {userId, patientId, coverageAmount, policyType, validFrom, validTo} = req.body;
        const result = await invoke.invokeTransaction('issueInsurance', {patientId, coverageAmount, policyType, validFrom, validTo}, userId);

        console.log("Response from chaincode", result);
        res.status(200).send({ success: true, data: result});

    } catch (error) {
        next(error);
    }
});

// get all insurance policies for a patient
// getPoliciesByPatient(ctx, patientId) - call by patient (own), insuranceAgent, insuranceAdmin, hospital
app.post('/getPoliciesByPatient', async function (req, res, next){
    try {
        const {userId, patientId} = req.body;
        const result = await query.getQuery('getPoliciesByPatient', {patientId}, userId);

        console.log("Response from chaincode", result);
        res.status(200).send({ success: true, data: result});

    } catch (error) {
        next(error);
    }
});

// create claim — patient or authorized doctor files a claim against an active policy
// createClaim(ctx, patientId, policyId, recordId, claimAmount, description) - call by patient or doctor
app.post('/createClaim', async function (req, res, next){
    try {
        const {userId, patientId, policyId, recordId, claimAmount, description} = req.body;
        const result = await invoke.invokeTransaction('createClaim', {patientId, policyId, recordId, claimAmount, description}, userId);

        console.log("Response from chaincode", result);
        res.status(200).send({ success: true, data: result});

    } catch (error) {
        next(error);
    }
});

// get claim info — fetch a single claim by patientId + claimId
// getClaimInfo(ctx, patientId, claimId) - call by patient (own), authorized doctor, insurance, hospital
app.post('/getClaimInfo', async function (req, res, next){
    try {
        const {userId, patientId, claimId} = req.body;
        const result = await query.getQuery('getClaimInfo', {patientId, claimId}, userId);

        console.log("Response from chaincode", result);
        res.status(200).send({ success: true, data: result});

    } catch (error) {
        next(error);
    }
});

// get all claims for a patient
// getAllClaimsByPatient(ctx, patientId) - call by patient (own), authorized doctor, insurance, hospital
app.post('/getAllClaimsByPatient', async function (req, res, next){
    try {
        const {userId, patientId} = req.body;
        const result = await query.getQuery('getAllClaimsByPatient', {patientId}, userId);

        console.log("Response from chaincode", result);
        res.status(200).send({ success: true, data: result});

    } catch (error) {
        next(error);
    }
});

// approve claim — insurance agent approves or rejects a PENDING claim
// approveClaim(ctx, patientId, claimId, decision, reason) - call by insuranceAgent/insuranceAdmin
// decision: 'APPROVED' | 'REJECTED'
app.post('/approveClaim', async function (req, res, next){
    try {
        const {userId, patientId, claimId, decision, reason} = req.body;
        const result = await invoke.invokeTransaction('approveClaim', {patientId, claimId, decision, reason}, userId);

        console.log("Response from chaincode", result);
        res.status(200).send({ success: true, data: result});

    } catch (error) {
        next(error);
    }
});


app.use((err, req, res, next) => {
    res.status(400).send(err.message);
})