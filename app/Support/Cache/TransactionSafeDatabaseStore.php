<?php

namespace App\Support\Cache;

use Illuminate\Cache\DatabaseStore;

/** Store cache database yang memakai {@see TransactionSafeDatabaseLock} untuk Cache::lock(). */
class TransactionSafeDatabaseStore extends DatabaseStore
{
    public function lock($name, $seconds = 0, $owner = null)
    {
        return new TransactionSafeDatabaseLock(
            $this->lockConnection ?? $this->connection,
            $this->lockTable,
            $this->prefix.$name,
            $seconds,
            $owner,
            $this->lockLottery,
            $this->defaultLockTimeoutInSeconds,
        );
    }
}
