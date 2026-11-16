# data/SOURCE.md

All data comes from the official NYC TLC trip record page (https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page); files are served from
`https://d37ci6vzurychx.cloudfront.net/`. No third-party mirror is used.

**Terms note (from the TLC page):** "Trip data is published monthly on this website, typically
with a two-month delay to allow time for full vendor submissions." The data is public, needs no
account, and is released by the TLC; see the nyc.gov "Terms of use" linked on the page. Trip files
are aggregated and then deleted from this repo's working tree; only daily counts are committed.
Please be advised (TLC): "there may be minor changes in the near future to standardize the
parquet schema across all years and datasets", so a re-download may differ from what is recorded
here: the sha256 column identifies the exact bytes used.

## Zone files

| file | bytes | sha256 |
|---|---|---|
| https://d37ci6vzurychx.cloudfront.net/misc/taxi_zones.zip | 1022574 | f6d711917bb4340f8f644d5366c51665489eb2d426dd1a4a55677721ae5adf17 |
| https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv | 12331 | 1a99e105092230f8620f301edcca7f80d3080642ff404d28ed957d3fa222c8ed |

## Trip files (135; table generated 2026-11-16)

| URL | aggregated (UTC) | bytes | sha256 | rows |
|---|---|---|---|---|
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2023-01.parquet | 2026-11-16 | 473816636 | cb066a3fe0770e44dde67cfc43e8b964b7b3ca7f2c90dc35d2d57cb7e41629b8 | 18479031 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2023-02.parquet | 2026-11-16 | 458895583 | 5a9f32bda414abcb0f04f2286ca8af5670ac9e535fdd86f2aa3840b71d62fdc2 | 17960971 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2023-03.parquet | 2026-11-16 | 522484870 | 57e607736d4460050e823acb1af82f9a23ed36382b131217fa56597f4f7c0f5a | 20413539 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2023-04.parquet | 2026-11-16 | 491826475 | edf8bfe4435fec30bc8830750834c570f597fc129e6a9b7779366280f4bed276 | 19144903 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2023-05.parquet | 2026-11-16 | 513108369 | af892a2dd4262a9197a6ba84ed53ce8b27e0746106b67e8fe8f0b4ca7eabd2f3 | 19847676 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2023-06.parquet | 2026-11-16 | 498799838 | cb78866e5a685db8733e2be8210d3f9498cef7e2aaa01086e88b363dfa825855 | 19366619 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2023-07.parquet | 2026-11-16 | 492310857 | 76a5e0b404a4ec0c2e70b2cf3f482fe64b117dc83602dcc4b31036e099347e55 | 19132131 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2023-08.parquet | 2026-11-16 | 450263712 | 1f657d06e9465217005104c594578100ab1b5c846f353efd87372f991709d6fd | 18322150 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2023-09.parquet | 2026-11-16 | 478067839 | 3f3fb7b6f62bf1a7ed07bfd1af7a23be0f798d101f27b77331e9a52b4d4a10f4 | 19851123 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2023-10.parquet | 2026-11-16 | 485826227 | fd577706331f37f6470945af6c268b27af036cf51eaa5689bc84481a1e0579f0 | 20186330 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2023-11.parquet | 2026-11-16 | 464926008 | a48486cfb760c0839a8f7b507f3b89d5ac5fc5433c67233dcb6a89c91ea08e1c | 19269250 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2023-12.parquet | 2026-11-16 | 490453634 | ff23e07001de2ec2d2e44f82d748c3a2ec88efdc5df7532248248cca59cc0dd9 | 20516297 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2024-01.parquet | 2026-11-16 | 472757547 | 9897de352aa52cea36b70348cc6721b8d4494327ce39c85f0dba83d86ecaa098 | 19663930 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2024-02.parquet | 2026-11-16 | 462475428 | 54bafa7bcf3f06e7833fcbccf7ef158eb793a72ee1c4bb8bf080e56ae71a15d6 | 19359148 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2024-03.parquet | 2026-11-16 | 507940560 | ff25b93f890f889637963b749d0839ec5a15f075d23ea5297b3312ed9a10d6d9 | 21280788 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2024-04.parquet | 2026-11-16 | 476115643 | 1493f3edd0486bf6c3f949cb5a66ec49e9d04f7ad6e94f85626f16aa6fec7260 | 19733038 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2024-05.parquet | 2026-11-16 | 498575918 | 152db11cbc95a796fea0b9cb26184b3c4cfad181fa9d7488d4c61f06c521b4b5 | 20704538 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2024-06.parquet | 2026-11-16 | 484417715 | 4772ee1ab01e639a5db74169b49049f74f0f46a0c925fd3b67f9f068221f6373 | 20123226 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2024-07.parquet | 2026-11-16 | 468437522 | 3a511a8df72441d72b32f6ce9829e29f5d61666e37f1b40b8d352cc5830c81e1 | 19182934 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2024-08.parquet | 2026-11-16 | 465991646 | 99fd2913d2c8935e4c1d166f229290a90971b6564c490a8ba2a257de9e08fae2 | 19128392 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2024-09.parquet | 2026-11-16 | 466470118 | d2d26d608a775555128a2b435d375f5d25d3d8125b688c57fc60d5a0fb5a1d3b | 19209788 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2024-10.parquet | 2026-11-16 | 485102359 | 8ee625798a6543148c3a3e33df5e2cf44acb17af904dbfff925d1cd4f077afb5 | 20028282 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2024-11.parquet | 2026-11-16 | 480228052 | cc3547280a9ff6edb4eaa467a3aa0ea2a372fca746e3e733d1ea3152d56daed3 | 19987533 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2024-12.parquet | 2026-11-16 | 507534115 | dcf0885722bc76ab7b5f22a23b784513caf7e7c2b23381ed854610c436c48887 | 21068851 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2025-01.parquet | 2026-11-16 | 491076642 | fcdef276f4e9887f2beab30590165cdea74caef50a1313d71fa01ff6afacca3a | 20405666 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2025-02.parquet | 2026-11-16 | 461632254 | 2077477d4d841b8ec40a3839b629f08f45f6802ca016adc1e01d6d8cffd2cf23 | 19339461 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2025-03.parquet | 2026-11-16 | 501783767 | 671399467732b00653307525421bfc6004e6a45be1fadd5e4b8fa3d11da22043 | 20536879 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2025-04.parquet | 2026-11-16 | 487219586 | d1edcd63ba37e87e0c6fda58cfc12352c0aa9ad9ad88dd2992094bc1ecd1e3b1 | 19753983 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2025-05.parquet | 2026-11-16 | 517386544 | 424be0dcc1248fd83dbf235805f2d475e19196ad64dc2e1d2e9c7b771851585a | 21091193 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2025-06.parquet | 2026-11-16 | 490819474 | f26bbe980f037a15f47f40da4ad7102b7aaebe0c9a8f3c1f6d058c6652007c88 | 19868009 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2025-07.parquet | 2026-11-16 | 487222980 | cae4e3d120f9af1a7369dad915dfe9beadda914b08a38ee8c045a4d09f085712 | 19653012 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2025-08.parquet | 2026-11-16 | 479574607 | e2efc965d31bd10f23224f5e007b463d037c45fbdaa6ded23c5deab01ec8d3b7 | 19271461 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2025-09.parquet | 2026-11-16 | 480851341 | 1744115e019e2f6e1e41214afb33f087a303620834c42021c642c5afca042d6f | 19434641 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2025-10.parquet | 2026-11-16 | 518486063 | 5610c7bcbe2aadd14761858eb7b94d3b01a2ee03d299c05f3575f72357f5b81a | 21308701 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2025-11.parquet | 2026-11-16 | 507485661 | a17ebafe3b6b1927f9b1b4cfc9062a328867b79a871ce762bfb16a841024f1e0 | 20818240 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2025-12.parquet | 2026-11-16 | 535754793 | 897e541b2a998df118dc5cc2b4182b74d14f6d0f2a950ef2bac3a8924ce6e95f | 22108438 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2026-01.parquet | 2026-11-16 | 505868728 | d7cdc852912fd7864166448a93cb40d7d6b09f136057b10ae31e9bb53d59c6f2 | 20940373 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2026-02.parquet | 2026-11-16 | 476780037 | 7f3c6737ed9a65884c9867ac2b8e05e358e56b42ecaf6d43f8009d40a9fce5c2 | 19875686 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2026-03.parquet | 2026-11-16 | 532615621 | 0f63d67cb9253b5a818cc4a1b2ddaf3a79955a6bf31c7577c53ff97fa040a262 | 22058358 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2026-04.parquet | 2026-11-16 | 509865567 | 15525aea9f82d55b885c6053414054e63f4c9abb3cdc44d78120a77d3aecc92b | 20995953 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2026-05.parquet | 2026-11-16 | 537576484 | e2b633a5be2280da537b4138f5bcb198eb04a6d3c2ef6bf7bd647f5b2c995287 | 22125744 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2026-06.parquet | 2026-11-16 | 506800012 | 300f8dccfae9025383deeec3c1daecf6c16653615dbdcfec8d77a76804314f48 | 20775868 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2026-07.parquet | 2026-11-16 | 511176663 | 8da280d9d23813aae02a6e1d1d1caa8b96eb5e8d38efcbc9a570faf1e418f5a8 | 20921249 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2026-08.parquet | 2026-11-16 | 502392134 | 0015770b14420035b9c7708091b765eb59d70f25cd7d663d2462194208a198f6 | 20493480 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/fhvhv_tripdata_2026-09.parquet | 2026-11-16 | 509720685 | b146f2cff09b004395b0fb22cea74e2e2ea7932982969949d859a6d6d9064376 | 20987681 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2023-01.parquet | 2026-11-16 | 1427002 | 9f0e03dd7f8f94ecc15949cdbfd2a4e1fc9ebb41a11882215158c9fc95012e31 | 68211 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2023-02.parquet | 2026-11-16 | 1533740 | bcc2821d639197cbb09aeb8994121a7004f2a6568a64bf4839015db802f62743 | 64809 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2023-03.parquet | 2026-11-16 | 1730999 | 69ab2c3b515ad1dd686a8ac3375370b8a44b003d95d340655d94828db0681d9d | 72044 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2023-04.parquet | 2026-11-16 | 1570467 | d28bf0485ac095e923c736180cf1b4fb247fdbcee1ae6d77eb78e7a185b7aacf | 65392 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2023-05.parquet | 2026-11-16 | 1673841 | 8545a8510b2f33e4bec7a2e12f9ff1f83752bb6a976dfbbc347b4fb7ae28eb2d | 69174 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2023-06.parquet | 2026-11-16 | 1563684 | 8f24ad7786b81240d39c87fb3d13a90a5d62e417a3a1dbbe6f55f933b181c02f | 65550 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2023-07.parquet | 2026-11-16 | 1470000 | a5063fa42a5d40aaa965d26033568d75cec3771069203bc286536df36e83d26f | 61343 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2023-08.parquet | 2026-11-16 | 1477938 | 814047ade6975e67c39b5bffeba304386be258ebef7adbcc572019e35128f13c | 60649 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2023-09.parquet | 2026-11-16 | 1561554 | d5fa110f59c10387fc2e4d3bbc4edd572291392bc209f972ce52387a8dd81c90 | 65471 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2023-10.parquet | 2026-11-16 | 1587100 | 2ef902d6c0aa5e17f2feb32e8356db9df7e8cd0110519bcd3bc31f4c35bf6a40 | 66177 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2023-11.parquet | 2026-11-16 | 1520705 | 5b117ff8ee0efe0cf532021588cad7d79c477e6fee3d3a6fb42b6140d4675fbf | 64025 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2023-12.parquet | 2026-11-16 | 1522951 | 1c43ac95b8b416293ab0b2953824ee5321443fc4c47e4236f295424e48e7aea3 | 64215 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2024-01.parquet | 2026-11-16 | 1362284 | 1512a953bed564ac68dcb622827424dfb4f68ad93c2a4572e50ef6ab0b09c1ad | 56551 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2024-02.parquet | 2026-11-16 | 1283805 | cb7eb405ee7e795c9fd6b8ad1b291f46f4e0a1cd60a57067b0aaca2420e8bc5d | 53577 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2024-03.parquet | 2026-11-16 | 1372372 | 43dedd66dd556acfc38da679a174b6adc32e01dd6dccad14bdfdf1521a14abed | 57457 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2024-04.parquet | 2026-11-16 | 1346502 | af174977258a02f8f44c37534abc9a8b4eaa5ec6d2f9c2bc49782327628b608c | 56471 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2024-05.parquet | 2026-11-16 | 1453912 | aa8b1965ed36f0bda1b342930d5e6f5a89f8fe56d0c6c6d77d9c156b408aa0ea | 61003 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2024-06.parquet | 2026-11-16 | 1326194 | 47e7c37dd39069c474364aee3d76c9ddc887a3f714e9bb550b5866fe0b89b9cd | 54748 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2024-07.parquet | 2026-11-16 | 1250973 | ce0d7591316050bea21da49e383eb733411e98ae17e114afcc7fbe4b36b116f2 | 51837 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2024-08.parquet | 2026-11-16 | 1267079 | 733210fb27cbe8cf8b0ad9f5d6fff03dfafcc8ff7c2beb1c1b707825d72f0376 | 51771 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2024-09.parquet | 2026-11-16 | 1326186 | 8f6aa8f3e8a2040fc161c7fbcb60e5418238b27e7e95998363572a4c977b69ce | 54440 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2024-10.parquet | 2026-11-16 | 1353731 | 6e737b7c4edac91f865aa210f7110d0118a9992b3a96720936e090277c24edaa | 56147 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2024-11.parquet | 2026-11-16 | 1264688 | fde255b43d4158124921b7c085d9abf15de5c5a9128c2ce0fb4e2372bc1e0d4a | 52222 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2024-12.parquet | 2026-11-16 | 1312306 | 1d708f58d29b0795a54ca11a36db6df61262986d122985f0fb52a56acc064bac | 53994 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-01.parquet | 2026-11-16 | 1178451 | 84f3a121667157efcbf012c3566a6065df6f8e0312c678cb2f29cd72cc9c0f10 | 48326 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-02.parquet | 2026-11-16 | 1117474 | b3ffe16a96ba0c68c8a8f8b10f049294ae6eb8d21f2e13b3fdbd452fa2e3498e | 46621 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-03.parquet | 2026-11-16 | 1253510 | d58e8d08e5e8a34c12f0d3f5ea049ae25c7c8215218a6af7bf6b8124ecde1c79 | 51539 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-04.parquet | 2026-11-16 | 1269227 | 6cf7ca2a4dd8907437e2e4b4728f62b353712ff09b322223a61e01aecee02411 | 52132 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-05.parquet | 2026-11-16 | 1338798 | dcbf4afce26d1adc544a89ee1bdac88089b1bbaa300685144d31eee646da58bb | 55399 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-06.parquet | 2026-11-16 | 1212934 | 451bc9f29382cca5dc33db05ff399cb137735d19c7449bbaa8b3348b0824f8e3 | 49390 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-07.parquet | 2026-11-16 | 1188380 | bbd6f9e5955570521df5c6dd40c1a75b37cccd730fcaff4fb50bcd32d2d35f69 | 48205 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-08.parquet | 2026-11-16 | 1149707 | ebaab192c199b850b0244e10c90622e472c1d4f2851168f950c9f75fe8db18d1 | 46306 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-09.parquet | 2026-11-16 | 1209831 | 932ea2cb6a56f83c4389148ce73427b07a63106375b607a361cd107cf7a32042 | 48893 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-10.parquet | 2026-11-16 | 1205685 | b124d57fb63fe610d085ce9ebef1528c082932313d86133a33d9c7a000883fe6 | 49416 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-11.parquet | 2026-11-16 | 1164775 | efcd45635c7982aa7ac832e5922c2e5495ebb5ce44e35491fea58d63fa7eba05 | 46912 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-12.parquet | 2026-11-16 | 1171145 | d1e9def5085c3be62dc8f827c9bbb6d32455b8ba69921d3e823d95435ab155fc | 48236 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2026-01.parquet | 2026-11-16 | 991656 | b0b188cd9ded91a9dfc931d9250aaca09fe388355d87802422707c6fc14762e0 | 40272 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2026-02.parquet | 2026-11-16 | 920753 | 2f7e3f379b2a14d675aed7eb9318a663dfb290eb11dbc66efbee581b63c3c962 | 37373 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2026-03.parquet | 2026-11-16 | 1082530 | 60c8bdfc0aa7826a2d6d2a6cca0f0e0dcb2d8aa7336212a45382794bb55b9cc0 | 44208 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2026-04.parquet | 2026-11-16 | 1075896 | e8dd2a0afde3fe8be942dd638fe1d946f8edbe5b377cf6c1d645e1206b3c7662 | 44238 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2026-05.parquet | 2026-11-16 | 1102947 | 15ff57840a1103d49298ad244492730ca4236b4de0d2758a689ded08bc332752 | 44921 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2026-06.parquet | 2026-11-16 | 1075836 | 08e214dcb285cb5cecb183635080e817ca24f0c6491eb7d387513fbe38258f97 | 44163 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2026-07.parquet | 2026-11-16 | 1018250 | 1e01084ab77643cc94e53ad7c30163dd7e8ef0be7b5bbf62bd45c19b7580ee87 | 41252 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2026-08.parquet | 2026-11-16 | 1007530 | 73539b4c19d1fc7e00a3809b09f0c1704283cff50398a022d9a01282c310e538 | 40687 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2026-09.parquet | 2026-11-16 | 1161701 | 9c5d21070c030254c2915bf9bd22a1bb48b7accff4f6c82d048a6822135c1f94 | 46676 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2023-01.parquet | 2026-11-16 | 47673370 | 32df6f67578fa86c484a6b5ef23a5281992ff085521082340b0f9e5889e9a572 | 3066766 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2023-02.parquet | 2026-11-16 | 47748012 | 4809e6aaac64f05a62d16a25d55713be1537ad64fc261e895eaf2d2120fe750a | 2913955 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2023-03.parquet | 2026-11-16 | 56127762 | e7d44943111b007bf0e7084863511886e0db29f862f9a96239383a1f86c6c26e | 3403766 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2023-04.parquet | 2026-11-16 | 54222699 | 95c01c53c865e06489179bdecce3a59603697a1557c4d5d183c20ae13a144dc6 | 3288250 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2023-05.parquet | 2026-11-16 | 58654627 | 9bd7d1c557bb9d0413619ba296b4828b884852a70bd07f2230b83f080d9a8591 | 3513649 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2023-06.parquet | 2026-11-16 | 54999465 | 3e60e29b5df45683948b68acbfb503aa459d14162c610622585c6580fdbfc73a | 3307234 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2023-07.parquet | 2026-11-16 | 48361828 | 98504ae351d920e9e0b61241f5707f90ee1588cfb199c378459234b5035805ab | 2907108 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2023-08.parquet | 2026-11-16 | 48152353 | 84ce36a2f84fa14c12fd976c79a7d4f30c871f1782b08ca7c27bb76ab946e66b | 2824209 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2023-09.parquet | 2026-11-16 | 47895515 | 091bf156bea5bb10bd217f5f12375f966f8789349af45d5ee4153e3e1e077a87 | 2846722 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2023-10.parquet | 2026-11-16 | 59009059 | dc5f069476d350df802ed8120f3b39ec321c34cfa905381e87f608c78ca0c645 | 3522285 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2023-11.parquet | 2026-11-16 | 56094653 | af203de0e73a92d640121f02a34326f25037d62380fc406237c87c2a4231ae58 | 3339715 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2023-12.parquet | 2026-11-16 | 56804275 | ab4f4db11cb31484747f62eb507c13fcfaff290aaf59c13e6465dea0b1166b9c | 3376567 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2024-01.parquet | 2026-11-16 | 49961641 | c4d59da7bbc8abaeeeb1727947ee93d9891a71acb42854bd80db1571b2030510 | 2964624 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2024-02.parquet | 2026-11-16 | 50349284 | c76c43c18c6c6664080dd920baab4928988d5786a6b65980792ca7cd796f9f20 | 3007526 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2024-03.parquet | 2026-11-16 | 60078280 | 2d4cdc8fb96726cdd3803b13b02d2e61e71d45720aff0ebc693a8bdd1f249823 | 3582628 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2024-04.parquet | 2026-11-16 | 59133625 | ce37f736c7cf9e92164c850ef2b502a8f7bb590fc1804b6edbcb80293da01b89 | 3514289 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2024-05.parquet | 2026-11-16 | 62553128 | 1974230be2b5a3ea92e47b5eb77f32dbf1de896d81ad8df4ab6faba52749ad23 | 3723833 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2024-06.parquet | 2026-11-16 | 59859922 | 677cf14c8347f745b583f012fbdba072334c6c4efa17bfd6a64369f2ba30329c | 3539193 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2024-07.parquet | 2026-11-16 | 52299432 | af12d6b04daeb78550799ae99933d495b27d715b6dbb0fad9bb750a4537d3070 | 3076903 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2024-08.parquet | 2026-11-16 | 51067350 | 7315643dd16bafc03e27d9903edbfd35404c2550a695d0da0a3e73852d940cfb | 2979183 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2024-09.parquet | 2026-11-16 | 61170186 | 2f42e4a383a6635de803001462848d0aee2b47f6ce899126805d2d05361fb843 | 3633030 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2024-10.parquet | 2026-11-16 | 64346071 | d19fe05aa0b259af24eb47051735293287f1e6dc263ba04030ec1ab4c6ec2650 | 3833771 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2024-11.parquet | 2026-11-16 | 60658709 | 5ef321876de5007a7c147a347389133fc94fd7ac28f82eb1d57d8f2cf05cfd3b | 3646369 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2024-12.parquet | 2026-11-16 | 61524085 | 41ebf7db80bebde60c58e5143c14cdf38ad04a0f3e3ff44215b3e240d55f6c78 | 3668371 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-01.parquet | 2026-11-16 | 59158238 | 9af277e4c0d3f9deb30644da822981e1e7df6af58313170fd3aa8a474485488a | 3475226 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-02.parquet | 2026-11-16 | 60343086 | 037cba555a73663f3a51a2c27816e40e3feb364769942bdf122b9da31e377bd3 | 3577543 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-03.parquet | 2026-11-16 | 69964745 | 20c4b77cce457b7cfdae77c5069ca7dc91c167f876a41467f4502ab69487a186 | 4145257 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-04.parquet | 2026-11-16 | 67352824 | 6f98938de9380a3f85600533816f0dc0e6d9b5b210e485d623952bac599bbe28 | 3970553 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-05.parquet | 2026-11-16 | 77837865 | 7ef46bcd0fceee7f8c0bb38a532be05bceefabb512d4bb0b32a7727dd862b15c | 4591845 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-06.parquet | 2026-11-16 | 73542954 | 1bea7f5b09c744414451fa7fef09fbc5a393ffb1621c859be6ba0df23a14e1b6 | 4322960 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-07.parquet | 2026-11-16 | 66943728 | 1efa6a0458dc60341f7f81dcbb5015af731f42d1a109f4e0d594dd46970fd4ef | 3898963 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-08.parquet | 2026-11-16 | 62293743 | b982ace703e3564d92e94edae5ec93515f4f1fb07a5b95e7404c32464c1a6a89 | 3574091 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-09.parquet | 2026-11-16 | 72432945 | cd39b9901f01d1fd752d45cbaec91ee5f68c4dddf9e261e938c1dbab404644c7 | 4251015 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-10.parquet | 2026-11-16 | 75267589 | e1f63caf331bc6230d9c6f757cb88e55fdc2bddde185fb414d2c947abdc773c3 | 4428699 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-11.parquet | 2026-11-16 | 71134255 | 2cf2f3127f96d4d5dea30f8afe05119cf8e4ba57bd9e60b789d3f296fc8459ab | 4181444 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-12.parquet | 2026-11-16 | 73701327 | eaba7ff61ebb6453fc6f673fda43d621380307f869b768b124992e8486c785e1 | 4305006 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2026-01.parquet | 2026-11-16 | 64165080 | 8b3933fe6f0d7b6d8826613c0dd724edc680ff7c49e2bd4c7635c05102728637 | 3724889 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2026-02.parquet | 2026-11-16 | 58683353 | 5352ca800f29c40a221ed5b0c6392c451fde7fcd236a73651bd5aea74713a26c | 3399866 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2026-03.parquet | 2026-11-16 | 67891249 | d7af794a7ac06cbbb5afb4d1df9e86d84f2e878584de708ff2ffca4bd7d234d9 | 3952451 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2026-04.parquet | 2026-11-16 | 64818115 | e03b82d5722a6b21d4fbce011afd8837495202c0b5db77ff0d8d15dd80834ba8 | 3831240 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2026-05.parquet | 2026-11-16 | 69699174 | 9aa5a1609e2bf07d9051b7d530de05b1019e12a560ecb2c59c137c8b3a8b6750 | 4090836 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2026-06.parquet | 2026-11-16 | 65465637 | f340c62a18885c56176433c9db28e97d0a8a14e6e49869276ad8afb20ebf088b | 3837248 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2026-07.parquet | 2026-11-16 | 61685033 | 3260bb629c2f334055f8a566cbb02c15476b15120c45d7ad0aae46fc4bb06612 | 3530109 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2026-08.parquet | 2026-11-16 | 59043961 | 6683a025443afcbb28ac4f238fcbb6334767dc69fab4a16b1eb16a78dcd013cd | 3336716 |
| https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2026-09.parquet | 2026-11-16 | 67374896 | 32d8d883e3fb9c0d681f4d47b205afe0fcb2a4830739673b4dd3bafbac9b0086 | 3876044 |
