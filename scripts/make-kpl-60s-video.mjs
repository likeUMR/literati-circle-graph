import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = 'C:/Users/23531/Documents/创意工作台-电竞/literati-circle-graph';
const out = join(root, 'recordings/final');
await mkdir(out, { recursive: true });
const clips = [
  ['recordings/kpl-shot-library/clips/01-01-orbit-original.mp4', 4], ['recordings/kpl-shot-library/clips/02-02-orbit-neural.mp4', 4],
  ['recordings/kpl-shot-library/clips/05-05-filter-nodes.mp4', 3], ['recordings/kpl-shot-library/clips/06-06-filter-relations.mp4', 3],
  ['recordings/kpl-shot-library/clips/07-07-search-hero.mp4', 4], ['recordings/kpl-shot-library/clips/08-08-hero-detail.mp4', 4],
  ['recordings/kpl-shot-library/clips/09-09-hero-to-player.mp4', 4], ['recordings/kpl-shot-library/clips/10-10-player-to-club.mp4', 4],
  ['recordings/kpl-shot-library/clips/11-11-club-to-season.mp4', 3], ['recordings/kpl-shot-library/clips/12-12-season-to-match.mp4', 3],
  ['recordings/kpl-shot-library/clips/13-13-match-round.mp4', 3], ['recordings/kpl-shot-library/clips/14-14-match-detail.mp4', 3],
  ['recordings/kpl-shot-library/clips/15-15-final-orbit.mp4', 3], ['recordings/kpl-showcase-game-5s/01-showcase-intro.mp4', 2],
  ['recordings/kpl-showcase-game-5s/02-showcase-asset-ledger.mp4', 2], ['recordings/kpl-showcase-game-5s/03-showcase-team-game.mp4', 2],
  ['recordings/kpl-showcase-game-5s/04-showcase-content-studio.mp4', 2], ['recordings/kpl-showcase-game-5s/05-showcase-city-map.mp4', 2],
  ['recordings/kpl-showcase-game-5s/06-game-opening.mp4', 2.5], ['recordings/kpl-showcase-game-5s/07-game-interaction.mp4', 2.5],
];
const list = clips.map(([file, duration]) => `file '${join(root, file).replaceAll('\\', '/')}'\ninpoint 0\noutpoint ${duration}`).join('\n');
await writeFile(join(out, 'concat.txt'), list, 'utf8');
const temp = join(out, 'KPL_60秒_无字幕.mp4');
const final = join(out, 'KPL_星图产品展示_60秒_含字幕.mp4');
const srt = join(out, 'KPL_60秒字幕.srt');
const overlayText = join(out, 'density-overlay.txt');
const concat = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(out, 'concat.txt'), '-t', '60', '-vf', 'fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-movflags', '+faststart', temp], { stdio: 'inherit' });
if (concat.status !== 0) process.exit(concat.status ?? 1);
const subtitleFilter = `subtitles='${srt.replaceAll('\\', '/').replaceAll(':', '\\:')}':fontsdir='C\\:/Windows/Fonts':force_style='FontName=Microsoft YaHei,FontSize=25,PrimaryColour=&H00FFFFFF,OutlineColour=&H99000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=58',drawtext=fontfile='C\\:/Windows/Fonts/msyh.ttc':textfile='${overlayText.replaceAll('\\', '/').replaceAll(':', '\\:')}':reload=0:fontcolor=white@0.78:fontsize=22:x=w-tw-36:y=28:box=1:boxcolor=black@0.36:boxborderw=8`;
const burn = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', temp, '-vf', subtitleFilter, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', final], { stdio: 'inherit' });
if (burn.status !== 0) process.exit(burn.status ?? 1);
console.log(final);
