### 安装coTurn服务器：
1.下载：https://github.com/coturn/coturn
    下载libenent 编译安装
    下载openssl 编译安装

2.配置：./configure --prefix=/usr/local/coturn
    配置成功后生成了makefile: ls -alt Makefile

3.编译：make -j4
4.安装：sudo make install


修改配置文件：turnserver.conf
修改环境变量: 
 vi ~/.zshrc (~/.bashrc)
export PATH="$HOME/.yarn/bin:$HOME/.config/yarn/global/node_modules/.bin:$PATH:/usr/local/coturn/bin"
# source ~/.zshrc

运行：turnserver -c ./etc/turnserver.conf
查看端口:[sudo] lsof -i:3478

============================================================================================================

### 安装websocket信令服务
forever守护nodejs进程
[sudo] npm install forever -g
#### 启动
forever start ./bin/www  ＃最简单的启动方式
forever start -l forever.log ./bin/www  #指定forever日志输出文件，默认路径~/.forever
forever start -l forever.log -a ./bin/www  #需要注意，如果第一次启动带日志输出文件，以后启动都需要加上 -a 参数，forever默认不覆盖原文件
forever start -o out.log -e err.log ./bin/www  ＃指定node.js应用的控制台输出文件和错误信息输出文件
forever start -w ./bin/www  #监听当前目录下文件改动，如有改动，立刻重启应用，不推荐的做法！如有日志文件，日志文件是频繁更改的

#### 重启
forever restart ./bin/www  ＃重启单个应用
forever restart [pid]  #根据pid重启单个应用
forever restartall  #重启所有应用

#### 停止（和重启很类似）
forever stop ./bin/www  ＃停止单个应用
forever stop [pid]  #根据pid停止单个应用
forever stopall  ＃停止所有应用

#### 查看forever守护的应用列表
forever list