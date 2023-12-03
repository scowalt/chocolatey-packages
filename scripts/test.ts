import { main as checkCryptomatorRelease } from "./cryptomator-release";
import { main as checkDepressurizerRelease } from "./depressurizer-release";
import { main as checkListaryRelease } from "./listary-release";

async function main() {
  await checkCryptomatorRelease();
  await checkDepressurizerRelease();
  await checkListaryRelease();
}

main();
