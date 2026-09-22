# assets/img

顔写真をここに置きます。 / Put your photo here.

```bash
pip install Pillow

# 証明写真（無地の背景）を、サイトのトーンに合わせたアバターにする
python3 tools/make_avatar.py ~/Desktop/photo.jpg --replace-bg

# 集合写真から自分だけを切り出す（まず --preview で範囲を確認）
python3 tools/make_avatar.py ~/Desktop/group.jpg --crop 0.55,0.10,0.19,0.62 --preview
python3 tools/make_avatar.py ~/Desktop/group.jpg --crop 0.55,0.10,0.19,0.62
```

`me.jpg` ができたら `assets/js/profile-config.js` に次を設定してください。

```js
avatar: "assets/img/me.jpg",
```

**集合写真をそのまま公開ページに載せるのは避けてください。**
写っている他の人は、公開サイトへの掲載に同意していません。
自分だけを切り出す `--crop` を使ってください。
