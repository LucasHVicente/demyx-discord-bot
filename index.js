const Discord = require('discord.js');
const { Util } = require('discord.js');
const ytdl = require('ytdl-core');
const YouTube = require('simple-youtube-api');

const {	prefix,	token, google_api_key} = require('./config.json');

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

const youtube = new YouTube(google_api_key);



const queue = new Map()


bot.login(token);

bot.once('ready',() =>{
  console.log(`Bot online: ${bot.user.tag}!`);
});

bot.on('guildMemberAdd', membro=>{
  const quote = demyxQuotes.welcomeQuotes[Math.floor(Math.random() * demyxQuotes.welcomeQuotes.length)]
  membro.send(quote);
})


bot.on('message',async msg=>{

  if(msg.author.bot) return;
  if(!msg.content.startsWith(prefix)) return;
  const voiceChannel = msg.member.voice.channel;
  const args = msg.content.substring(prefix.length).split(" ");
  const searchString = args.slice(1).join(' ');
  const url = args[1] ? args[1].replace(/<(._)>/g, '$1'): ''
  const serverQueue = queue.get(msg.guild.id)

  if(msg.content.startsWith(`${prefix}play`)){

    if(!voiceChannel) return msg.channel.send('You neet to be in a voice channel first');
    const permissions = voiceChannel.permissionsFor(msg.client.user);
    if(!permissions.has('CONNECT')) return msg.channel.send("Hey! I don't have permission to connect to the voice channel!")
    if(!permissions.has('SPEAK')) return msg.channel.send("Hey! I don't have permission to speak in the channel!")

    if(url.match(/https:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)){
      const playlist = await youtube.getPlaylist(url);
      const videos = await playlist.getVideos();
      for(const video of Object.values(videos)){
        const video2 = await youtube.getVideoByID(video.id)
        await handleVideo(video2, msg, voiceChannel, true )
      }
      msg.channel.send(`playlist __**${playlist.title}**__ has been added to the`)
      return undefined

    }else{
      try {
        var video = await youtube.getVideoByID(url)
      } catch {
        try {
          var videos = await youtube.searchVideos(searchString, 1);
          var video = await youtube.getVideoByID(videos[0].id);
  
        } catch  {
          return msg.channel.send("I couldn't find any search results")
        }
      }
    }
    return handleVideo(video, msg, voiceChannel)

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
    }else if(msg.content.startsWith(`${prefix}volume`)){
      if(!voiceChannel) return msg.channel.send('You need to be in a voice channel first')
      if(!serverQueue) return msg.channel.send('There is nothing playing')
      if(!args[1]) return msg.channel.send(`The volume is : **${serverQueue.volume}**`)
      if(isNaN(args[1])) return msg.channel.send(`That is not a valid volume`)

      serverQueue.volume = args[1];
      serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1]/5)
      msg.channel.send(`I have changed the volume to: **${args[1]}**`)

      return undefined;
    }else if(msg.content.startsWith(`${prefix}now`)){
      if(!serverQueue) return msg.channel.send('There is nothing playing')
      msg.channel.send(`Now playing: __**${serverQueue.songs[0].title}**__`);
      return undefined;
    }else if(msg.content.startsWith(`${prefix}queue`)){
      if(!serverQueue) return msg.channel.send('There is nothing playing')
      msg.channel.send(`
__**Song Queue:**__
${serverQueue.songs.map((song, index)=> `**${index+1}-** ${song.title}`).join('\n')}
**Now Playing: ** ${serverQueue.songs[0].title}
      `, {split:true})
      return undefined;
    }else if(msg.content.startsWith(`${prefix}pause`)){
      if(!voiceChannel) return msg.channel.send('You need to be in a voice channel first')
      if(!serverQueue) return msg.channel.send('There is nothing playing')
      if(!serverQueue.playing) return msg.channel.send('The music is already paused')

      serverQueue.playing = false;
      serverQueue.connection.dispatcher.pause()
      msg.channel.send("I have paused the music");
      return undefined
    }else if(msg.content.startsWith(`${prefix}resume`)){
      if(!voiceChannel) return msg.channel.send('You need to be in a voice channel first')
      if(!serverQueue) return msg.channel.send('There is nothing playing')
      if(serverQueue.playing) return msg.channel.send('The music is already playing')

      serverQueue.playing = true;
      serverQueue.connection.dispatcher.resume()
      msg.channel.send("I have resumed the music");
      return undefined
    }
  }
  return undefined
})
async function handleVideo(video, msg, voiceChannel, playlist =false) {
  const serverQueue = queue.get(msg.guild.id);

  const song = {
    id: video.id,
    title: Util.escapeMarkdown(video.title),
    url:`https://www.youtube.com/watch?v=${video.id}`
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
      queueConstuct.connection = connection;
      
      play(msg.guild, queueConstuct.songs[0]);
      
      
    } catch (error) {
      console.log(error);
      queue.delete(msg.guild.id)
      return msg.channel.send('There was an error while joining the voice channel:', error);
    }
  }else{
    serverQueue.songs.push(song)
    if(playlist) return undefined

    const quote = demyxQuotes.musicPlayQuotes[Math.floor(Math.random() * demyxQuotes.musicPlayQuotes.length)]
      
    return msg.channel.send(`${quote} ${song.title} has been added to the queue!`)
  }
 return undefined
}

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
    const quote = demyxQuotes.musicPlayQuotes[Math.floor(Math.random() * demyxQuotes.musicPlayQuotes.length)]

    serverQueue.textChannel.send(`${quote} __**${song.title}**__`)
}