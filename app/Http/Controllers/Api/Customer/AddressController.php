<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\CustomerAddressRequest;
use App\Http\Resources\CustomerAddressResource;
use App\Models\CustomerAddress;
use App\Services\CustomerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @group Pelanggan: Alamat
 *
 * @authenticated
 */
class AddressController extends Controller
{
    public function __construct(private readonly CustomerService $customers) {}

    /** Alamat tersimpan. */
    public function index(Request $request): AnonymousResourceCollection
    {
        return CustomerAddressResource::collection($request->user()->addresses()->orderByDesc('is_default')->orderBy('id')->get());
    }

    /** Tambah alamat. */
    public function store(CustomerAddressRequest $request): JsonResponse
    {
        $address = $this->customers->saveAddress($request->user(), $request->validated());

        return (new CustomerAddressResource($address))->additional(['message' => 'Alamat berhasil disimpan.'])->response()->setStatusCode(201);
    }

    /** Detail alamat. */
    public function show(CustomerAddress $address): CustomerAddressResource
    {
        $this->authorize('view', $address);

        return new CustomerAddressResource($address);
    }

    /** Ubah alamat. */
    public function update(CustomerAddressRequest $request, CustomerAddress $address): CustomerAddressResource
    {
        $this->authorize('update', $address);

        $address = $this->customers->saveAddress($request->user(), $request->validated(), $address);

        return (new CustomerAddressResource($address))->additional(['message' => 'Alamat berhasil diperbarui.']);
    }

    /** Hapus alamat. */
    public function destroy(CustomerAddress $address): JsonResponse
    {
        $this->authorize('delete', $address);

        $this->customers->deleteAddress($address);

        return response()->json(['message' => 'Alamat berhasil dihapus.']);
    }
}
