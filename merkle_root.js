const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

main();

async function main() {
  let list = [
    '0x5ae71e71549Ad23e93A4d0582C470180B9530a31',
    '0xaF3bf14B17900f02E0188F50f675CfDde4ed8776',
    '0x0D1a8dbBde47340e1aD0c7dCC38E42AB7a45E8e9',
    '0x337493F5C16B697e98D6cB21Da8f240A140BBE72',
    '0x4B95C00789c5ef1bee520D63e980455666148E2E',
    '0x8360d6D8A7B00C0564130B0f1FB6e82789415deE',
    '0x050144aC034e76FafB6BAf81CB40Aff5991a01Fb',
  ];
  let merkleTree = new MerkleTree(list, keccak256, { hashLeaves: true, sortPairs: true });
  let root = merkleTree.getHexRoot();
  console.log('Merle Root is %s', root);
}
