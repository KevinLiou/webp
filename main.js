const { createApp } = Vue

const app = createApp({
    data() {
        return {
            imgQuality: 100,
            info: "",
            files: []
        }
    },
    computed: {
        allCompleted() {
            return (this.files.filter(x=>(x.state==2||x.state==-1)).length == this.files.length) && (this.files.length > 0)
        }
    },
    mounted: function() {
        const dropbox = document.getElementById("upload_zone");
        const preview = document.getElementById("preview");
        const fileUploader = document.getElementById("fileUploader");

        function handleFileSelect(e) {
            e.stopPropagation();
            e.preventDefault();
            fileUploader.click();
        }

        const cc = e => handleFileSelect(e);

        // prevent the default method working
        function dragenter(e) {
            // add the styling to div
            dropbox.classList.add("upload_zone_enter");
            e.stopPropagation();
            e.preventDefault();
        }

        const dragleave = () => dropbox.classList.remove("upload_zone_enter");

        // prevent the default method working
        function dragover(e) {
            e.stopPropagation();
            e.preventDefault();
        }

        function drop(e) {
            e.stopPropagation();
            e.preventDefault();

            const dt = e.dataTransfer;
            const files = dt.files;

            app.handleFiles(files);
            dropbox.classList.remove("upload_zone_enter");
        }
        

        dropbox.addEventListener("click", cc, false);
        dropbox.addEventListener("dragenter", dragenter, false);
        dropbox.addEventListener("dragleave", dragleave, false);
        dropbox.addEventListener("dragover", dragover, false);
        dropbox.addEventListener("drop", drop, false);

        // document.addEventListener('contextmenu', function (e) {
        //     e.preventDefault();
        // });
    },
    methods: {
        handleFiles(files) {
            for (var i = 0; i < files.length; i++) {
                const file = files[i];
                const imageType = /image.*/;

                if (!file.type.match(imageType)) {
                    continue;
                }

                const reader = new FileReader();
                reader.onload = (e => {
                    var res = e.target.result
                    var obj = {
                        "id": md5(res), 
                        "data": res, 
                        "file": file, 
                        "info": "--", 
                        "state": 0, 
                        "type": "image",
                        "size": Math.floor(file.size/102.4)/10,
                        "name": file.name
                    }
                    var includes = app.files.some(x => x.id == obj.id)
                    if (!includes) {
                        app.files.push(obj)
                    }
                });
                reader.readAsDataURL(file);
            }

            const fileUploader = document.getElementById("fileUploader");
            fileUploader.value = '';
        },
        imgQualityChanged(event) {
            let newValue = event.target.value
            this.imgQuality = newValue
        },
        deleteImage(obj, index) {
            this.files.splice(index, 1)
        },
        clear() {
            if (this.allCompleted) {
                this.files = []
            }else{
                for (let index = this.files.length - 1; index >= 0; index--) {
                    const obj = this.files[index];
                    if (obj.state == 0) {
                        this.deleteImage(obj, index)
                    }
                }
            }
        },
        nextConversion() {
            if (this.allCompleted) {
                this.completeToast()
            }else{
                this.processFile()
            }
        },
        processFile() {
            var that = this
            this.files.forEach(function(value, index) {
                console.log(index, value);

                value['state'] = 1
                value['info'] = '轉檔中...'
                that.files[index] = value

                const image = new Image();
                image.onload = () => {
                    // 透過canvas轉檔
                    const canvas = document.createElement('canvas');
                    canvas.width = image.naturalWidth;
                    canvas.height = image.naturalHeight;
                    canvas.getContext('2d').drawImage(image, 0, 0);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const fileNameWithoutExtension = value.file.name.split('.')[0];
                            var filename = `${fileNameWithoutExtension}.webp`
                            // const webpImage = new File([blob], filename, { type: blob.type });
                            // console.log(webpImage)

                            value['webp'] = blob
                            value['state'] = 2
                            value['info'] = '轉檔成功'
                            that.files[index] =  value

                            if (that.allCompleted) {
                                that.completeToast()
                            }
                        }else{
                            value['state'] = -1
                            value['info'] = '轉檔失敗'
                        }
                    }, 'image/webp', (that.imgQuality/100));
                };
                image.src = URL.createObjectURL(value.file); // 圖片來源
            });
        },
        completeToast() {
            var s = `<span>已全數轉檔完成, 成功:${this.files.filter(x=>x.state==2).length}, 失敗:${this.files.filter(x=>x.state==-1).length}</span><br/><button class="btn-flat toast-action" onclick="app.downloadAll()">下載全部檔案</button>`
            M.toast({html: s, displayLength: 9000, classes: 'rounded green darken-1'})
        },
        downloadAll() {
            if (this.files.filter(x=>x.state==2).length == 0) { return }

            const currentDateTime = new Date().toISOString().replace(/[-:]/g, '').replace('T', '').split('.')[0];
            var zip = new JSZip();
            var imgFolder = zip.folder(currentDateTime);

            this.files.forEach(function(value, index) {
                if (value.state == 2) {
                    const fileNameWithoutExtension = value.file.name.split('.')[0];
                    var filename = `${fileNameWithoutExtension}.webp`
                    console.log('value.blob', value.webp)
                    imgFolder.file(filename, value.webp);
                }
            })
            
            zip.generateAsync({type:"blob"})
            .then(function(content) {
                const filename = `${currentDateTime}.zip`;
                saveAs(content, filename);
            });
        }
    }
}).mount('#app')