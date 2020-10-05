const Discord = require('discord.js');
const ytdl = require('ytdl-core');

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
  membro.send(`Seja bem vindo! Siga as regras do servidor e divirta-se`);
})

bot.on('message',async msg=>{//comandos de mensagens
  if(msg.content === prefix+'oi'){
    msg.reply('Hello there!');
  }
  if(msg.content === prefix+'dance'){//comando de dance
    const msgAttachment = new Discord.MessageAttachment('https://i.imgur.com/w3duR07.png');
    msg.reply('Dance water! Dance', msgAttachment);

  }
  if(msg.content=== prefix+'comandos'){//lista comandos
    msg.reply('Os comandos disponiveis são: !oi; !comandos;');
  }
  if(msg.content === prefix+'avatar'){//mostra imagem do avatar
    msg.reply(msg.author.displayAvatarURL());
  }
  if(msg.content ===(prefix+'play')){//toca musica
    if (msg.member.voice.channel) {
      const connection = await msg.member.voice.channel.join();
      // const streamOptions = { seek: 0, volume: 1 };
      // const stream = ytdl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', { filter: 'audioonly' })
      // connection.play('http://www.sample-videos.com/audio/mp3/wave.mp3');
    } else {
      msg.reply('Voce precisa entrar em um canal antes!');
    }
  }
})