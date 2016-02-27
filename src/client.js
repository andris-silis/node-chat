import readline from "readline";


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.setPrompt("Talk to me > ");
rl.prompt();

rl.on("line", (line) => {
    console.log(line);
    rl.prompt();
}).on('close', () => {
    console.log("Exiting");
    process.exit(0);
});
