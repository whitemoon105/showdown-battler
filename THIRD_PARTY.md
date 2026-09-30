# 第三方来源与归属

- Pokémon Showdown 引擎：[smogon/pokemon-showdown](https://github.com/smogon/pokemon-showdown)，MIT。项目依赖为 artifacts/pokemon-showdown-0.11.11.tgz，实际依赖版本和校验值见 package-lock.json。保留依赖的 LICENSE。
- 在线客户端及对战动画：[pokemon-showdown-client](https://github.com/smogon/pokemon-showdown-client)。应用加载官方客户端，沿用连接、对战协议、选招控件与原生动画事件，另作本地界面适配。
- 数值使用率：[Smogon stats](https://www.smogon.com/stats/)。示例配装：[Showdown data/sets](https://play.pokemonshowdown.com/data/sets/gen9ou.json)。每份 assets/recommendations/*.json 记录具体规则、数据 URL、月份及分段；不把独立边际使用率组合宣称为官方完整示例配装。
- Pokémon 图像优先使用[神奇宝贝百科](https://wiki.52poke.com/)；属性图集来自 [MediaWiki:Common.css](https://wiki.52poke.com/wiki/MediaWiki:Common.css) 使用的 MST_SV.webp，来源记录在 assets/type-icons-source.json。逐文件 URL、实际图像类型与动画信息见 assets/battle-media/manifest.json。
- 缺少对应神百形态图时使用 [Showdown sprites](https://github.com/smogon/sprites)，道具图集来自 play.pokemonshowdown.com/sprites/itemicons-sheet.png。另保留已有 [PokéAPI sprites](https://github.com/PokeAPI/sprites) 道具图和 [PokéAPI cries](https://github.com/PokeAPI/cries) 叫声。
- 朱紫模型动画补充来自 [WikiDex 的朱紫动画分类](https://www.wikidex.net/wiki/Categor%C3%ADa:Sprites_animados_de_Pok%C3%A9mon_Escarlata_y_Pok%C3%A9mon_P%C3%BArpura)，包括 [厄诡椪水井面具](https://www.wikidex.net/wiki/Archivo:Ogerpon_m%C3%A1scara_fuente_EP.webm) 等。原始动画、文件页与贡献者署名以各文件页为准；示例文件注明 Mega611 生成、Asg180 提供方法，仆刀将军 GIF 文件注明 adamsb0303。逐项来源与转换参数保存于 assets/battle-media/manifest.json；本地以透明 WebP 保留原动画，不把静图的位移当作原始模型动画。
- 已有背面图、部分演出与背景音乐来自 [PokéRogue assets](https://github.com/pagefaultgames/pokerogue-assets)，[图像署名](https://wiki.pokerogue.net/credits:sprites)、[动画署名](https://wiki.pokerogue.net/credits:animations) 和 [上游许可](https://github.com/pagefaultgames/pokerogue-assets/tree/beta/LICENSES) 仍适用。补充记录见 assets/battle-media-sources.toml。
- 中文名称来自 [PokéAPI](https://github.com/PokeAPI/pokeapi) 和 [PSChina Server Translation SV](https://greasyfork.org/zh-CN/scripts/432623-pschina-server-translation-sv)（AL、WyAK，MIT）；原汉化脚本保留作者元数据。
- Electron、undici、cheerio 及其依赖保留各自许可。测试使用 Playwright，不随应用打包。

Pokémon 图像、声音及商标属于各自权利人。维基文字许可不等于宝可梦图像许可，应用源码许可不会重新许可这些资源。本软件为独立项目，不代表 Pokémon、神百或 Showdown 官方。
