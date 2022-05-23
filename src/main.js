require('dotenv').config({path: __dirname + '/.env'});
const Discord = require('discord.js');
const { Util } = require('discord.js');
const ytdl = require('ytdl-core');
const YouTube = require('simple-youtube-api');

const prefix = "demyx.";
const token = process.env.TOKEN
const google_api_key = process.env.GOOGLE_API_KEY

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
  }
const bot = new Discord.Client();

const youtube = new YouTube(google_api_key);

// testing github editor

const queue = new Map()


bot.login(token);

bot.once('ready',() =>{
  console.log(`Bot online: ${bot.user.tag}!`);
});

bot.on('message', async msg =>{
  //ignore own messages
  if(msg.author.bot) return;
  //verify if message has the configured prefix
  if(!msg.content.startsWith(prefix)) return;

  
  
  const voiceChannel = msg.member.voice.channel;
  const args = msg.content.substring(prefix.length).split(" ");
  const searchString = args.slice(1).join(' ');
  const url = args[1] ? args[1].replace(/<(._)>/g, '$1'): ''
  const serverQueue = queue.get(msg.guild.id)

  const method = msg.content.split(`${prefix}`)[1].split(' ')[0].toLowerCase()
  switch (method) {
    case 'play':
      //play method
      if(!voiceChannel) return msg.channel.send('You need to be in a voice channel first.');
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
        msg.channel.send(`playlist __**${playlist.title}**__ has been added to the queue.`)
        return undefined

      }else{
        try {
          var video = await youtube.getVideoByID(url)
        } catch {
          try {
            var videos = await youtube.searchVideos(searchString, 10);
            var index = 0 ;
            msg.channel.send(`
              __**Select a Song:**__
              ${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}
              Select one song between 1 and 10
            `)
            try {
              var response = await msg.channel.awaitMessages(msg=>msg.content> 0 && msg.content <11, {
                max: 1,
                time: 30000,
                errors: ['time']
              })
            } catch (error) {
              msg.channel.send('No or invalid song selection was provided, please select a valid one.')
            }
            const videoIndex = parseInt(response.first().content)

            var video = await youtube.getVideoByID(videos[videoIndex -1].id);
    
          } catch  {
            return msg.channel.send("I couldn't find any search results.")
          }
        }
      }
      return handleVideo(video, msg, voiceChannel)

    case 'stop':
      // stop method
      if(!voiceChannel) return msg.channel.send('You need to be in a voice channel first.')
      if(!serverQueue) return msg.channel.send('There is nothing playing.')

      serverQueue.songs = []
      serverQueue.connection.dispatcher.end()

      const quote = demyxQuotes.musicStopQuotes[Math.floor(Math.random() * demyxQuotes.musicStopQuotes.length)]
      msg.channel.send(quote);

      return voiceChannel.leave();
    
    case 'skip':
      if(!voiceChannel) return msg.channel.send('You need to be in a voice channel first.')
      if(!serverQueue) return msg.channel.send('There is nothing playing.')
      serverQueue.connection.dispatcher.end()
      const randomQuote = demyxQuotes.musicPlayQuotes[Math.floor(Math.random() * demyxQuotes.musicPlayQuotes.length)]
      msg.channel.send("Okay then, let's skip to the next one.");
      if(serverQueue.songs.length>=2) return serverQueue.textChannel.send(`${randomQuote} __**${serverQueue.songs[1].title}**__`)
      else return msg.channel.send('Playlist ended.');

    case 'remove':
      if(!voiceChannel) return msg.channel.send('You need to be in a voice channel first.')
      if(!serverQueue) return msg.channel.send('There is nothing playing.')
      const songIndex = msg.content.split(' ')[1] - 1;
      const removeSong = serverQueue.songs[songIndex]

      if(removeSong === serverQueue.songs[0]) serverQueue.connection.dispatcher.end()
      else serverQueue.songs = serverQueue.songs.filter(song=>song !== removeSong)
      
      return msg.channel.send(`Removed song __**${removeSong.title}**__`)

    case 'volume':
      if(!voiceChannel) return msg.channel.send('You need to be in a voice channel first.')
      if(!serverQueue) return msg.channel.send('There is nothing playing.')
      if(!args[1]) return msg.channel.send(`The volume is : **${serverQueue.volume}**`)
      if(isNaN(args[1])) return msg.channel.send(`That is not a valid volume.`)

      serverQueue.volume = args[1];
      serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1]/5)
      return msg.channel.send(`I have changed the volume to: **${args[1]}**`)
      
      
    case 'now':
      if(!serverQueue) return msg.channel.send('There is nothing playing.')
      return msg.channel.send(`Now playing: __**${serverQueue.songs[0].title}**__`);

    case 'queue':
      if(!serverQueue) return msg.channel.send('There is nothing playing.')
      return msg.channel.send(`
__**Song Queue:**__
${serverQueue.songs.map((song, index)=> `**${index+1}-** ${song.title}`).join('\n')}
**Now Playing: ** ${serverQueue.songs[0].title}
      `, {split:true})

    case 'loop':
      if(!voiceChannel) return msg.channel.send('You need to be in a voice channel first.')
      if(!serverQueue) return msg.channel.send('There is nothing playing.')
      serverQueue.loop = !serverQueue.loop
      return msg.channel.send(` ${serverQueue.loop? `Let's loop the playlist!`: `Okay, i'm just playing these once.`} `)

    case 'pause':
      if(!voiceChannel) return msg.channel.send('You need to be in a voice channel first.')
      if(!serverQueue) return msg.channel.send('There is nothing playing.')
      if(!serverQueue.playing) return msg.channel.send('The music is already paused.')

      serverQueue.playing = false;
      serverQueue.connection.dispatcher.pause()
      return msg.channel.send("I have paused the music.");
    
    case 'resume':
      if(!voiceChannel) return msg.channel.send('You need to be in a voice channel first.')
      if(!serverQueue) return msg.channel.send('There is nothing playing.')
      if(serverQueue.playing) return msg.channel.send('The music is already playing.')

      serverQueue.playing = true;
      serverQueue.connection.dispatcher.resume()
      return msg.channel.send("I have resumed the music");
      
    
    case 'randomize':
      if(!voiceChannel) return msg.channel.send('You need to be in a voice channel first.')
      if(!serverQueue) return msg.channel.send('There is nothing playing.')
      const nextSongs = serverQueue.songs.slice(1, serverQueue.songs.length)
      serverQueue.songs = [
        serverQueue.songs[0], 
        ...nextSongs
          .map(value => ({ value, sort: Math.random() }))
          .sort((a, b) => a.sort - b.sort)
          .map(({ value }) => value)]
      return msg.channel.send(`Queue randomized.`);

    case 'help':
      return msg.channel.send(`
__**Available commands:**__
**${prefix}play:** Add songs to the playlist.
**${prefix}stop:** Stop playing and disconnect bot.
**${prefix}now:** Show the song currently playing.
**${prefix}queue:** Show the playlist.
**${prefix}skip:** Skip to the next song.
**${prefix}pause:** Pause the current song.
**${prefix}resume:** Resume the current song.
**${prefix}loop:** Loop the playlist.
**${prefix}randomize:** Randomize the playlist.
**${prefix}remove:** Remove selected song by index.
      `)
      
    default:
      break;
  }

})

async function handleVideo(video, msg, voiceChannel, playlist = false) {
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
      playing: true,
      loop: false,
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
      if(!serverQueue.loop) serverQueue.songs.shift()
      play(guild, serverQueue.songs[0])
    })
    .on('error', err=>{
      console.log(err);
    })
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
}
