
package com.schoolofbreath.musicplayer

import android.app.Service
import android.content.Intent
import android.os.IBinder

class MusicPlayerService : Service() {

    override fun onBind(intent: Intent): IBinder? {
        return null
    }
}
