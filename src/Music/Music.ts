/**
 * 
 * Music Singleton
 * 
 * Features:
 * (1) plays generated music and sound effects
 * 
 * To do:
 * (1) Implement an audio worklet for this script
 */


// Import Howl class for music sfx
//import { Howl } from 'howler';


import { zzfxM } from '../../src/Zzfxm/zzfxm';
import {zzfxP, zzfxX} from  "../../src/Zzfxm/zzfx";



export class Music {
    public enable : boolean = false;
    public volume : number = 50;
    public default_playlist: Record<number,string> =  {
        0:"./audio/songs/under_world.js",
        1:"./audio/songs/castlevania2_bloody.js"
    };

    // track debug variables 
    public stream : AudioBufferSourceNode | undefined;
    public stream_length : number = 0;
    public Playback_position : number = 0;
    public track : string = "";
    public buffer : number[][] | undefined;

    public wasPlaying : boolean = false;

    //audio worklet
    public audioCtx!: AudioContext;
    public workletNode!: AudioWorkletNode;


    constructor(){


        document.addEventListener("click", async () => {

            if (this.audioCtx?.state !== "running") {
                await this.audioCtx.resume();
                console.log("Audio unlocked");
            }

        }, { once: true });


                // ---- ADD TAB VISIBILITY HANDLER ----
        // this turns the music off if the browser tab
        // is no longer visible
        // works
        document.addEventListener("visibilitychange", async () => {
            if (document.hidden){
                if (this.audioCtx?.state === "running"){
                    //this.stream.stop();
                    //await zzfxX.suspend();
                    
                    await this.audioCtx.suspend();

                    //this.wasPlaying = true;
                    console.log("pausing music");
                }
            }
            else{
                if (this.audioCtx?.state !== "running"){
                    await this.audioCtx.resume();

                    //await zzfxX.resume();
                    console.log("resuming game music");
                }
            }
        });




        // Play a sound effect
        // bugs sfx file
        //const carSfx = new Howl({
        //  src: ['./car-acceleration-inside-car.ogg'],
        //  volume: 0.5,
        //});
        // ------------------------------------------------------
        // MUSIC & SFX
        // -----------------------------------------------------
        // 
        // old depreciated howler js music infra.
        // to do: (1) implement  Zzfxm for the music

        //const music = new Howl({
        //src: ['./beaach_sex_chike_san.ogg'],
        //loop: true,
        //volume: 0.5,
        //});
        //music.play();

        this.play();
    }

    async play(){
        /**
         * Plays Audio on Main thread & a worklet
         * 
         * @returns 
         */

        if (!this.workletNode) {
                await this.initAudioWorklet();
            }


        const load = async ()  => {

                let newTrack = this.shuffle(this.default_playlist); // get a random track

                console.log ("track debug : ", newTrack);
                const res = await fetch(newTrack);
                const src = await res.text();

                //debug if the track was fetched
                //console.log("track debug 2: ", src);
                
                // bug:
                // parsing of audio files breaks in final build
                return this.unsafeParse(src); 
                
            };


              // Renders the song. ZzFXM blocks the main thread so defer execution for a few
         // ms so that any status message change can be repainted.
         // to do:
        // (1) Use audio worklet to play the music and not the game's main thread to fix audio lag
        const render = (song : any[]) : Promise<number[][]> => {
            return new Promise(resolve => {
                setTimeout(() => resolve(zzfxM(song[0], song[1], song [2])), 50);
            });
        }

        try{
            const song = await load();
            const buffer = await render(song);
            
            this.buffer = buffer;

            // Send samples to worklet
            this.workletNode.port.postMessage({
                type: "load",
                left: buffer[0],
                right: buffer[1]
            });

            await this.audioCtx.resume();

            
        }
        
         catch (err){

         
            console.error("Music error:", err);
            //this.isPlaying = false;
         }


    }

    async initAudioWorklet() {

        if (!this.audioCtx) {
            this.audioCtx = zzfxX; // reuse zzfx context
        }

        await this.audioCtx.audioWorklet.addModule(
            "/audio/zzfxm-worklet.js"
        );

        this.workletNode = new AudioWorkletNode(
            this.audioCtx,
            "zzfxm-processor",
            {
                numberOfOutputs: 1,
                outputChannelCount: [2]
            }
        );

        this.workletNode.connect(this.audioCtx.destination);

        this.workletNode.port.onmessage = (e) => {

            if (e.data.type === "ended") {
                console.log("Track finished (worklet)");
                this.play();
            }
        };
    }


    shuffle(playlist: Record<number, string>) : string {

        //var track = this.default_playlist;

        // port godot random shuffle code for this implementation
        // Filter out the last played track and pick a random one from the remaining tracks
        //var availableTracks = this.default_playlist.filter(track => track !== this.lastPlayedTrack);
        //this.randomTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];


        // Log the selected track
        //console.log("Selected Track: ", this.randomTrack, "/", this.counter);

        // Shuffle function ported
        const keys = Object.keys(playlist).map(Number);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        return playlist[randomKey];

    }

    unsafeParse(str: string) : any {

            //console.log(str);
            // regex process the song files
            // bug :
            // (1) regex logic creates whitespace bug when parsing json
            str = str.replace(/\[,/g,'[null,')
            .replace(/,,\]/g,',null]')
            .replace(/,\s*(?=[,\]])/g,',null')
            .replace(/([\[,]-?)(?=\.)/g,'$10')
            .replace(/-\./g,'-0.')
            .replace(/\/\/# sourceMappingURL=.*$/gm, ''); //whitespace fixed


            return JSON.parse(str, (key, value) => {
            if (value === null) {
                return undefined;
            }
            return value;
            });
    };

}