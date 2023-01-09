const AWS= require('aws-sdk');
const express =require("express");
const bodyParser=require('body-parser');
const fileupload = require("express-fileupload");
const cors=require('cors');
const fs= require('fs');
const {v4 : uuidv4} = require('uuid')
const ffmpeg =require("fluent-ffmpeg");
const { exec } = require("child_process");


const app = express();


app.use(fileupload());
app.use(express.static("files"));
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

AWS.config.update({accessKeyId:"",secretAccessKey:"",region:'ap-south-1'});
const Polly= new AWS.Polly({
    region:'ap-south-1'
})

const s3 = new AWS.S3();


app.get("/",(req,res)=>{
    res.send("Welcome to our website")
})
app.post("/upload",async(req,res)=>{
    const file = req.files.file;
    const uniqueName=uuidv4();
    const inputVideo = __dirname +'/upload/inputVideo/'+ uniqueName + '.mp4';
    let inputAudio= __dirname +'/upload/inputAudio/'+uniqueName+'.mp3';

    file.mv(inputVideo);

    const text= `${req.body.firstName} ${req.body.lastName} ${req.body.customMessage}`;
    const input ={
        Text: text,
        OutputFormat: "mp3",
        VoiceId: "Joanna"
    }
    Polly.synthesizeSpeech(input,async(err,data)=>{
        fs.writeFileSync(inputAudio,data.AudioStream)
        let outputVideo=__dirname +'/upload/outputVideo/'+ uniqueName + '.mp4';
        ffmpeg()
        .addInput(inputVideo) //your video file input path
        .addInput(inputAudio) //your audio file input path
        .output(outputVideo) //your output path
        .outputOptions(['-map 0:v', '-map 1:a', '-c:v copy', '-shortest'])
        .on('start', (command) => {
            console.log('TCL: command -> command', command)
        })
        .on('error', (error) => console.log("errrrr",error))
        .on('end',()=>{
            res.json({path:outputVideo,name:`${uniqueName}.mp4`});
        })
        .run()  
        // await exec(`ffmpeg -i ${inputVideo} -i ${inputAudio}  -c:v copy -c:a aac -shortest -strict  experimental -map 0:v:0 -map 1:a:0  ${outputVideo}`);
        // res.json({path:outputVideo,name:`${uniqueName}.mp4`});
    })


})


app.post('/uploadtos3',async(req,res)=>{
    const fileName=req.body.name
    const path= `./upload/outputVideo/${fileName}`;
    const fileContent = fs.readFileSync(path)

    const params = {
    Bucket:"merged-audio-with-video" ,
    Key: fileName,
    Body: fileContent
    }

    s3.upload(params,(err,data)=>{
        res.json({path:data.Location})
    })
})

app.post("/download", async(req, res) => {
    var params = {
        Bucket: 'merged-audio-with-video', 
        Key: req.body.name
      };
      let readStream = s3.getObject(params).createReadStream();
      let writeStream = fs.createWriteStream("/home/amitsharma/Desktop/amit23.mp4");
      readStream.pipe(writeStream);
    
      res.send("success");
})



const PORT=5000;



app.listen(PORT, () => console.log(`Server running on the port ${PORT}`));