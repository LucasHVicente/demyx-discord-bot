const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const demyxQuotes = 
  {
    musicPlayQuotes : [
      "Dance, water! Dance! ",
      "Come on, keep to the beat! ",
      "Pipe down and listen! ",
      "Demyx time!"
    ],
    musicStopQuotes : [
      "I could reeealy use a break. ",
      "Yeah? Well, no biggie!I'll just find a comfy spot and kick back for a while. ",
      "Hey, even us Nobodies need our rest, right? "
    ],
    welcomeQuotes : [
      "So, uh... you play any instruments?No?...Never mind. "
    ]
  }
const bot = new Discord.Client();
const {
	prefix,
	token,
} = require('./config.json');

bot.login(token);

bot.once('ready',() =>{
  console.log(`Bot online: ${bot.user.tag}!`);
});

bot.on('guildMemberAdd', membro=>{
  const quote = demyxQuotes.musicPlayQuotes[Math.floor(Math.random() * demyxQuotes.welcomeQuotes.length)]
  membro.send(quote);
})


bot.on('message',async msg=>{//comandos de mensagens

  if(msg.author.bot) return;
  if(!msg.content.startsWith(prefix)) return;
  const voiceChannel = msg.member.voice.channel;
  const args = msg.content.substring(prefix.length).split(" ");

  if(msg.content.startsWith(`${prefix}play`)){
    if (msg.member.voice.channel) {
      const connection = await voiceChannel.join();
      const quote = demyxQuotes.musicPlayQuotes[Math.floor(Math.random() * demyxQuotes.musicPlayQuotes.length)]
      msg.channel.send(quote + args[1]);
      const dispatcher = connection.play(ytdl(args[1]))
      .on('finish', ()=>voiceChannel.leave())
      .on('error', err=>{
        console.log(err);
      })
      dispatcher.setVolumeLogarithmic(5 / 5);
    } else {
      msg.reply('Voce precisa entrar em um canal de voz antes!');
    }
  }else {
    if(msg.content.startsWith(`${prefix}stop`)){
      if(!voiceChannel) return msg.channel.send('Voce precisa entrar em um canal de voz antes')
      voiceChannel.leave();
      const quote = demyxQuotes.musicStopQuotes[Math.floor(Math.random() * demyxQuotes.musicPlayQuotes.length)]
      return msg.channel.send(quote);
    }
  }
  if(msg.content === prefix+'dance'){//comando de dance
    const msgAttachment = new Discord.MessageAttachment('https://i.imgur.com/w3duR07.png');
    msg.reply('Dance water! Dance!', msgAttachment);

  }
  
})