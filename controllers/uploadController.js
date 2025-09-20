const path = require('path');

const uploadSingle = async (req,res) => {
    try {
        if (!req.file){
            return res.status(400).json({ message : 'No file uploaded' });
        }
        const url = `${req.protocol}://${req.get('host')}/uploads/${path.basename(req.file.destination)}/${req.file.filename}`;

        res.status(201).json({
           url,
           filename : req.file.filename,
           mimeType : req.file.mimetype,
           size : req.file.size 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message : 'Server Error' });
    }
}

const uploadMultiple = async (req,res) => {
    try {
        if (!req.files || req.files.length == 0) {
            return res.status(400).json({ message : 'No files uploaded' });
        }
        const files = req.files.map(file => {
            const url = `${req.protocol}://${req.get('host')}/uploads/${path.basename(file.destination)}/${file.filename}`;
            return {
                url,
                filename : file.filename,
                mimeType : file.mimetype,
                size : file.size
            };
        });
        res.status(201).json(files);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message : 'Server Error' });
    }
}

module.exports = { uploadSingle,uploadMultiple };