export const meetingLink = (seed, audioOnly = false) => {
  const base = `https://meet.jit.si/reactchat-${seed}`;
  return audioOnly ? `${base}#config.startWithVideoMuted=true` : base;
};