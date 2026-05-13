Here are the notes for my video I made setting up my FoundryVTT server on my mini-pc running Ubuntu (20.04).

Video link:

## *Update Ubuntu*

### *Make sure your system is up to date!*

If this is a new install, when you log into Ubuntu you will be prompted to connect to an Ubuntu Single Sign-on account. This is recommended and free for personal use. This is needed for automatic updates. Once connected, click on the App drawer ("boxes" in lower left) and click on "Software Updates", if updates are running this will show. Wait until it is finished. It may ask to reboot the system. Once all Updates are done you should see "the software on this computer is up to date":

<img width="538" height="140" alt="image" src="https://github.com/user-attachments/assets/1cc78207-fb62-45a0-bdb0-c7f46ff55ec2" />

If you see this you should be good to proceed.

if you want to update via terminal command line, use this command:  
`sudo apt update && sudo apt upgrade -y && sudo apt autoremove -y`

### *Change Password*

The next thing we want to make sure to do if you have not already is update the default password. The mini-pc that I purchased had a very generic one taped to the bottom. If you installed Ubuntu yourself you can skip this step as you already created your own password.

Follow this guide to change the default password: https://help.ubuntu.com/stable/ubuntu-help/user-changepassword.html

### *Install / enable SSH*

Optimally, this will be a dedicated FoundryVTT server. We will not need to have it attached to a monitor/keyboard/mouse and we will not need to access it directly. I have mine sitting next to my Cable Modem connected directly to my router. So we will need access to SSH into it to install FoundryVTT, manually update it, restart FoundryVTT, or Reboot the system.

> [!NOTE]
> Commands below will be entered using Terminal.

Guide: https://www.cyberciti.biz/faq/how-to-install-ssh-on-ubuntu-linux-using-apt-get/

First make sure we are up-to-date:  
`sudo apt-get update && sudo apt-get upgrade`

Now install OpenSSH  Server  
`sudo apt-get install openssh-server`

Enable SSH  
`sudo systemctl enable ssh`

By default, firewall will block ssh access. Therefore, you must enable ufw and open ssh port

`sudo ufw allow ssh`

Check to make sure everything is working  
`sudo systemctl status ssh`

you should see something like this:  
<img width="599" height="415" alt="How-to-Enable-SSH-on-Ubuntu-Linu" src="https://github.com/user-attachments/assets/2b258d39-9bec-43ae-99ad-d988e8024fc1" />


### *Get IP address*

We will need the IP address to SSH into it and to access FoundryVTT later.  
`ifconfig`

You will see something similar to the following. The IP we need is highlighted:  
<img width="726" height="485" alt="image" src="https://github.com/user-attachments/assets/aa7e05b1-7ba7-445d-8702-9214f971e6ec" />


If you get an error that ifconfig command is not found you need to install net-tools

`sudo apt-get install net-tools`

### *Connect from Windows PC*

Now we test if we can connect to SSH from our PC (assuming you are using Windows, if not you probably do not need this guide lol).

We will need a SSH client to connect. I recommend Putty, a free powerful tool.

Download: https://www.putty.org/

Use Putty to connect to the IP address and log in:

<img width="450" height="440" alt="image" src="https://github.com/user-attachments/assets/46fdf70d-5ba7-46b4-8ad4-b1595e96b5f4" />
<img width="558" height="277" alt="image" src="https://github.com/user-attachments/assets/2f3cf72a-c4c0-49ff-8c5e-569cae06b9d0" />


## *Install FoundryVTT*

Now we will install FoundryVTT through SSH.

We will be *mostly* following the guide here: https://foundryvtt.com/article/installation/ with some changes.

Install Node.js (run these 3 commands seperately)

```
sudo apt install -y libssl-dev
curl -sL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs
```

> [!NOTE]
> If at this point you get an error that user is not in sudoers file, you will have to go back to the Ubuntu computer and enter the following command in the Terminal window:
>
> `usermod -aG sudo username`

Now we will setup the directories for FoundryVTT

```
cd ~
mkdir foundryvtt
mkdir foundrydata
```

Go into the foundryvtt folder  
`cd foundryvtt`

For the next step we will need to log into the FoundryVTT website and get a download link. This will only work for a short period of time so have it up and ready. Go to https://foundryvtt.com/community/thejoester/licenses (make sure you are logged in), make sure to select which version you want (1) and "Linux/NodeJS" (2), and click "Timed URL" (3)

<img width="947" height="411" alt="image" src="https://github.com/user-attachments/assets/7157b9b5-4a20-4d86-857b-442ab51b4abe" />

Now, quickly go back to the Putty window and enter the following command - make sure the URL is surrounded by quotes

`wget -O foundryvtt.zip "<foundry-website-download-url>"`

Once the download is finished, unzip the downloaded file  
`unzip foundryvtt.zip`

When the unzip finishes with no errors, delete the .zip file  
`sudo rm foundryvtt.zip`

Go back to your home DIR  
`cd ~`

Now we will need to test that Foundry will run. 

> [!NOTE]
> Note that here I use the full path, you will need to modify this to fit your user home path.

`node /home/<user>/foundryvtt/resources/app/main.js --dataPath=/home/<user>/foundrydata`

You should see something like this:  
<img width="923" height="515" alt="image" src="https://github.com/user-attachments/assets/07424655-96e1-4c46-a6c4-c73b642b0cc6" />


While this is up, open your browser and browse to http://\<ipaddress\>:30000 where "IPADDRESS" is the IP Address we got earlier using ifconfig\*\*.\*\*</ipaddress>

Foundry should load and ask you for a license. You can enter it now if you want, but you do not need to yet.

Go back to the Putty SSH session, and hit **CONTROL+C** to shut down the Foundry server.

## *Setup FoundryVTT to run as a service*

The method above would require that any time we want FoundryVTT running we would need to connect to it via SSH and manually start the application. Here we will set it up so that it will run in the background as a service and start at boot. There are a couple ways to do this, but I will be using the method recommended by the Foundry Devs using PM2.

First we need to install PM2  
`sudo npm install pm2@latest -g`

Once installed we will need to configure PM2 to startup on boot. Enter the following command, and it will generate another command for you to run.

`pm2 startup`

Run the command provided 

> [!TIP]
> In Putty if you highlight text, it auto copies to clipboard, and you can then right click to paste it into the command line.

<img width="836" height="68" alt="image" src="https://github.com/user-attachments/assets/65925a54-559b-4c6a-9953-885375316d23" />

in the image above the command it gave me was:

`sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u joe --hp /home/joe`

Now we will reboot  
`sudo reboot`

This will reboot Ubuntu and end your SSH session. Wait a minute then reconnect.

Once reconnected we will create a PM2 service for FoundryVTT. You will need to edit the paths to match yours. Be sure to use the full path, and make sure the command is inside the quotes as below:

`pm2 start "node /home/<user>/foundryvtt/resources/app/main.js --dataPath=/home/<user>/foundrydata" --name foundry`

the --name foundry part names the service "foundry", you can choose something different if you would like.  You will see something like this:

<img width="1094" height="151" alt="image" src="https://github.com/user-attachments/assets/dce0b98e-47b4-4401-851e-4056716be9bf" />

Now we need to save the current state, so that upon boot foundry will start  
`pm2 save`

<img width="418" height="73" alt="image" src="https://github.com/user-attachments/assets/c14dca26-4588-4da2-b191-474b14a2f701" />
 
That's it! We should be done! to be sure you can once again reboot:  
`sudo reboot`

And check that Foundry is running  
`pm2 list`  
you will see something like this:  
<img width="1103" height="116" alt="image" src="https://github.com/user-attachments/assets/bfd30faf-9374-4e20-b891-45a462e49f7c" />


## *Other useful commands:*

Here are some other useful commands that you may want to note down. **Note:** if you named the PM2 process something other than "foundry" then you will need to change it below.

`pm2 log foundry`

This will show you the last 15 lines for the foundry service, and continue to monitor it. Hit Control+C to exit.

`pm2 monit`

This will open a new window that constantly monitors all services running for PM2. Hit Control+C to exit.

You can Stop, Start, and Restart Foundry with the following commands:

```
pm2 stop foundry
pm2 start foundry
pm2 restart foundry
```

To manually make sure your Ubuntu OS is up to date, run the following command. I run this at least once a week.

`sudo apt update && sudo apt upgrade -y && sudo apt autoremove -y`

That should have you up and running!
