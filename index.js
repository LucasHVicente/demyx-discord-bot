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

const queue = new Map()


bot.login(token);

bot.once('ready',() =>{
  console.log(`Bot online: ${bot.user.tag}!`);
});

bot.on('guildMemberAdd', membro=>{
  const quote = demyxQuotes.welcomeQuotes[Math.floor(Math.random() * demyxQuotes.welcomeQuotes.length)]
  membro.send(quote);
})


bot.on('message',async msg=>{//comandos de mensagens

  if(msg.author.bot) return;
  if(!msg.content.startsWith(prefix)) return;
  const voiceChannel = msg.member.voice.channel;
  const args = msg.content.substring(prefix.length).split(" ");

  const serverQueue = queue.get(msg.guild.id)

  if(msg.content.startsWith(`${prefix}play`)){

    if(!voiceChannel) return msg.channel.send('You neet to be in a voice channel first');
    const permissions = voiceChannel.permissionsFor(msg.client.user);
    if(!permissions.has('CONNECT')) return msg.channel.send("Hey! I don't have permission to connect to the voice channel!")
    if(!permissions.has('SPEAK')) return msg.channel.send("Hey! I don't have permission to speak in the channel!")

    const songInfo = await ytdl.getInfo(args[1])
    const song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url
    }

    if(!serverQueue){
      const queueConstuct = {
        textChannel: msg.channel,
        voiceChannel: voiceChannel,
        connection: null,
        songs: [],
        volume: 5,
        playing: true
      }
      queue.set(msg.guild.id, queueConstuct)

      queueConstuct.songs.push(song);
      try {
        const connection = await voiceChannel.join();
        const quote = demyxQuotes.musicPlayQuotes[Math.floor(Math.random() * demyxQuotes.musicPlayQuotes.length)]
        msg.channel.send(quote+ ' ' + queueConstuct.songs[0].title);
        queueConstuct.connection = connection;
        
        play(msg.guild, queueConstuct.songs[0]);
        
        
      } catch (error) {
        console.log(error);
        queue.delete(msg.guild.id)
        return msg.channel.send('There was an error while joining the voice channel:', error);
      }
    }else{
      serverQueue.songs.push(song)
      const quote = demyxQuotes.musicPlayQuotes[Math.floor(Math.random() * demyxQuotes.musicPlayQuotes.length)]
        
      return msg.channel.send(`${quote} ${song.title} has been added to the queue!`)
    }
    return undefined;

  }else {
    if(msg.content.startsWith(`${prefix}stop`)){
      if(!voiceChannel) return msg.channel.send('You need to be in a voice channel first')
      if(!serverQueue) return msg.channel.send('There is nothing playing')

      serverQueue.songs = []
      serverQueue.connection.dispatcher.end()

      const quote = demyxQuotes.musicStopQuotes[Math.floor(Math.random() * demyxQuotes.musicStopQuotes.length)]
      msg.channel.send(quote);

      voiceChannel.leave();

    }else if(msg.content.startsWith(`${prefix}skip`)){
      if(!voiceChannel) return msg.channel.send('You need to be in a voice channel first')
      if(!serverQueue) return msg.channel.send('There is nothing playing')

      serverQueue.connection.dispatcher.end()
      msg.channel.send("Okay then, let's skip to the next one.");
      return undefined;
    }
  }
})

function play(guild, song){
  const serverQueue = queue.get(guild.id);

  if(!song){
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return
  }

  const dispatcher = serverQueue.connection.play(ytdl(song.url))
    .on('finish', ()=>{
      serverQueue.songs.shift()
      play(guild, serverQueue.songs[0])
    })
    .on('error', err=>{
      console.log(err);
    })
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
}