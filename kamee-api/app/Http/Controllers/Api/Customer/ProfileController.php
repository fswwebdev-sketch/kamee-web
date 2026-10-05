<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\UpdateProfileRequest;
use App\Http\Resources\CustomerResource;
use Illuminate\Http\Request;

/**
 * @group Pelanggan: Profil
 *
 * @authenticated
 */
class ProfileController extends Controller
{
    /** Profil saya. */
    public function show(Request $request): CustomerResource
    {
        return new CustomerResource($request->user()->load('tier'));
    }

    /** Ubah profil. */
    public function update(UpdateProfileRequest $request): CustomerResource
    {
        $customer = $request->user();
        $customer->update($request->validated());

        return (new CustomerResource($customer->load('tier')))->additional(['message' => 'Profil berhasil diperbarui.']);
    }
}
