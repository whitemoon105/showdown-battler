'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const base=process.env.DFY_PLAY_HOME||(fs.existsSync('E:/Entertainment')?'E:/Entertainment/AppData/ShowdownBattler':path.join(process.env.APPDATA||os.homedir(),'ShowdownBattler'));
module.exports={base,data:base,cache:process.env.DFY_PLAY_CACHE||(fs.existsSync('E:/Entertainment')?'E:/Entertainment/Caches/ShowdownBattler':path.join(base,'Cache')),downloads:fs.existsSync('D:/Downloads/Browser')?'D:/Downloads/Browser':path.join(os.homedir(),'Downloads')};
