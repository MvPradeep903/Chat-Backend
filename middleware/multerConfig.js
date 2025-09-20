const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ensureDir = (dir) => {
    if(!fs.existsSync(dir)) { fs.mkdirSync(dir , { recursive : true })};
}

const storage = multer.diskStorage({
    destination : (req,file,cb) => {
        const mime = file.mimetype;
        let dest = path.join(__dirname,'..','uploads','files');

        if(mime.startsWith('image/')) { 
            dest = path.join(__dirname,'..','uploads','images');
        } else if (mime.startsWith('audio/')) {
            dest = path.join(__dirname,'..','uploads','audio'); 
        } else if (mime.startsWith('video/')) {
            dest = path.join(__dirname,'..','uploads','videos');
        }
        ensureDir(dest);
        cb(null,dest);
    },
    filename : (req,file,cb) => {
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname,ext).replace(/\s+/g,'_').slice(0,50);
        cb(null,`${Date.now()}_${name}${ext}`);
    }
});

const upload = multer({ storage,limits : { fileSize : 50 * 1024 * 1024 } });

module.exports = upload;